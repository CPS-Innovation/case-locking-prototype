// Broad media type used for filtering material, as opposed to the specific
// file type (PDF, MP4, etc.) stored on the document.
const fileTypesByMediaType = {
  Document: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'Other'],
  Audio: ['MP3'],
  Video: ['MP4'],
  Image: ['JPG', 'PNG'],
}

const mediaTypes = Object.keys(fileTypesByMediaType)

function getMediaType(fileType) {
  return mediaTypes.find(mediaType => fileTypesByMediaType[mediaType].includes(fileType)) || 'Document'
}

module.exports = { mediaTypes, fileTypesByMediaType, getMediaType }
