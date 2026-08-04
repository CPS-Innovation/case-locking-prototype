async function resetAllData(prisma) {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
  )

  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF')
  for (const { name } of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${name}"`)
  }
  // Reset autoincrement counters so IDs restart at 1, matching what a fresh
  // `db push --force-reset` produces (some seed helpers hardcode expected IDs).
  await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence')
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON')
}

module.exports = { resetAllData }
