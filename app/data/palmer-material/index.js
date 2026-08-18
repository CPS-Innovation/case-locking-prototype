const content = require('./content')
const documents = require('./documents')

const documentsByName = new Map(documents.map(document => [document.name, document]))

function getContent(documentName) {
  return content[documentName] || null
}

function getImages(documentName) {
  return documentsByName.get(documentName)?.images || null
}

module.exports = { documents, getContent, getImages }
