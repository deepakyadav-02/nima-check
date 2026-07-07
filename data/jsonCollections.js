/**
 * Maps JSON files in JSONS/json to MongoDB collection names.
 */
const JSON_FOLDER_MAPPINGS = [
  {
    file: '2025-2ndsem.json',
    collection: '2025-2ndsem',
    label: 'UG 2nd Semester 2025',
    apiPath: 'ug-2ndsem2025',
  },
  {
    file: 'excel-to-json4thsem(2024).json',
    collection: '2024-4thsem',
    label: 'UG 4th Semester 2024',
    apiPath: 'ug-4thsem2024',
  },
];

const getMappingByCollection = (collection) =>
  JSON_FOLDER_MAPPINGS.find((item) => item.collection === collection);

const getMappingByApiPath = (apiPath) =>
  JSON_FOLDER_MAPPINGS.find((item) => item.apiPath === apiPath);

module.exports = {
  JSON_FOLDER_MAPPINGS,
  getMappingByCollection,
  getMappingByApiPath,
};
