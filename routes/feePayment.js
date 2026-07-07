const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const FeePayment = require('../models/FeePayment');
const { FEE_ACADEMIC_YEAR } = require('../data/feeStructure2026');
const {
  isEligibleForUgFees,
  resolveStudentFeeBreakdown,
} = require('../utils/feeCalculator');
const { findStudentRecord, formatStudentSummary } = require('../utils/studentLookup');

const router = express.Router();

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const categoryLabels = {
  boys: 'Boys',
  girls: 'Girls',
  scStPh: 'SC/ST/PH',
};

const streamLabels = {
  arts: 'Arts',
  science: 'Science',
  commerce: 'Commerce',
};

const buildFeeResponse = async (student, resolvedType, autonomousRollNo) => {
  const summary = formatStudentSummary(student, resolvedType);
  const eligible = isEligibleForUgFees(resolvedType);

  if (!eligible) {
    return {
      eligible: false,
      message: 'Fee payment is currently available only for +3 UG (2nd & 3rd year) students.',
      student: summary,
      academicYear: FEE_ACADEMIC_YEAR,
    };
  }

  const { assignment, breakdown } = resolveStudentFeeBreakdown(student, resolvedType);

  const paidPayments = await FeePayment.find({
    autonomousRollNo,
    academicYear: FEE_ACADEMIC_YEAR,
    status: 'paid',
  }).sort({ paidAt: -1 });

  if (assignment.error) {
    return {
      eligible: false,
      message: assignment.error,
      student: summary,
      academicYear: FEE_ACADEMIC_YEAR,
      feeAssignment: assignment,
      paidPayments,
    };
  }

  const alreadyPaid = paidPayments.some(
    (payment) => payment.yearLevel === assignment.yearLevel && payment.status === 'paid'
  );

  return {
    eligible: true,
    academicYear: FEE_ACADEMIC_YEAR,
    student: summary,
    feeAssignment: {
      yearLevel: assignment.yearLevel,
      yearLabel: breakdown.yearLabel,
      stream: assignment.stream,
      streamLabel: streamLabels[assignment.stream],
      category: assignment.category,
      categoryLabel: categoryLabels[assignment.category],
    },
    breakdown,
    alreadyPaid,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    paymentsEnabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    paidPayments,
  };
};

// @route   GET /api/fee-payment/config
// @desc    Get pre-assigned fee breakdown for logged-in student
// @access  Private
router.get('/config', auth, async (req, res) => {
  try {
    const { autonomousRollNo, studentType } = req.user;
    const { student, studentType: resolvedType } = await findStudentRecord(autonomousRollNo, studentType);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const response = await buildFeeResponse(student, resolvedType, autonomousRollNo);
    res.json(response);
  } catch (error) {
    console.error('Fee config error:', error.message);
    res.status(500).json({ message: 'Failed to load fee details' });
  }
});

// @route   POST /api/fee-payment/create-order
// @desc    Create Razorpay order using the student's assigned fee
// @access  Private
router.post('/create-order', auth, async (req, res) => {
  try {
    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(503).json({
        message: 'Payment gateway is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to config.env.',
      });
    }

    const { autonomousRollNo, studentType } = req.user;
    const { student, studentType: resolvedType } = await findStudentRecord(autonomousRollNo, studentType);

    if (!student || !isEligibleForUgFees(resolvedType)) {
      return res.status(400).json({ message: 'Fee payment not available for your course type' });
    }

    const { assignment, breakdown } = resolveStudentFeeBreakdown(student, resolvedType);

    if (assignment.error || !breakdown) {
      return res.status(400).json({ message: assignment.error || 'Fee not assigned for your profile' });
    }

    const { yearLevel, stream, category } = assignment;

    const existingPaid = await FeePayment.findOne({
      autonomousRollNo,
      academicYear: FEE_ACADEMIC_YEAR,
      yearLevel,
      status: 'paid',
    });

    if (existingPaid) {
      return res.status(400).json({
        message: `You have already paid ${breakdown.yearLabel} fees for ${FEE_ACADEMIC_YEAR}.`,
        payment: existingPaid,
      });
    }

    const summary = formatStudentSummary(student, resolvedType);
    const receipt = `fee_${autonomousRollNo}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '_');

    const order = await razorpay.orders.create({
      amount: breakdown.total * 100,
      currency: 'INR',
      receipt,
      notes: {
        autonomousRollNo,
        academicYear: FEE_ACADEMIC_YEAR,
        yearLevel,
        stream,
        category,
      },
    });

    const paymentRecord = await FeePayment.create({
      studentId: summary.id,
      studentType: resolvedType,
      autonomousRollNo,
      studentName: summary.name,
      department: summary.department,
      academicYear: FEE_ACADEMIC_YEAR,
      yearLevel,
      yearLabel: breakdown.yearLabel,
      stream,
      category,
      lineItems: breakdown.lineItems,
      amount: breakdown.total,
      razorpayOrderId: order.id,
      status: 'created',
    });

    res.json({
      orderId: order.id,
      amount: breakdown.total,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      breakdown,
      paymentRecordId: paymentRecord._id,
      prefill: {
        name: summary.name,
      },
    });
  } catch (error) {
    console.error('Create order error:', error.message);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// @route   POST /api/fee-payment/verify
// @desc    Verify Razorpay payment signature and mark as paid
// @access  Private
router.post('/verify', auth, [
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: 'Payment gateway is not configured' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const { autonomousRollNo } = req.user;

    const paymentRecord = await FeePayment.findOne({
      razorpayOrderId: razorpay_order_id,
      autonomousRollNo,
    });

    if (!paymentRecord) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (paymentRecord.status === 'paid') {
      return res.json({ message: 'Payment already verified', payment: paymentRecord });
    }

    const bodyStr = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(bodyStr)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      paymentRecord.status = 'failed';
      await paymentRecord.save();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    paymentRecord.status = 'paid';
    paymentRecord.razorpayPaymentId = razorpay_payment_id;
    paymentRecord.razorpaySignature = razorpay_signature;
    paymentRecord.paidAt = new Date();
    await paymentRecord.save();

    res.json({
      message: 'Payment successful',
      payment: paymentRecord,
    });
  } catch (error) {
    console.error('Verify payment error:', error.message);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

// @route   GET /api/fee-payment/my-payments
// @desc    Get payment history for logged-in student
// @access  Private
router.get('/my-payments', auth, async (req, res) => {
  try {
    const { autonomousRollNo } = req.user;
    const payments = await FeePayment.find({ autonomousRollNo }).sort({ createdAt: -1 });
    res.json({ payments });
  } catch (error) {
    console.error('Payment history error:', error.message);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
});

module.exports = router;
