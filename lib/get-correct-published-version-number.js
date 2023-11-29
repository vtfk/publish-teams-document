const getCorrectPublishedVersionNumber = (version, hasVersioning) => {
  if (hasVersioning) return version
  const versionNumberAfterOneUpdate = `${Number(version)+1}.0`
  return versionNumberAfterOneUpdate
}

module.exports = getCorrectPublishedVersionNumber