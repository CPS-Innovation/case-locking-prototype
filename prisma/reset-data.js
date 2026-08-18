// PRAGMA foreign_keys is a per-connection setting, and Prisma may run
// different queries in this function on different pooled connections - so
// toggling it off isn't reliable. Instead, work out delete order from each
// table's actual foreign keys so children are always cleared before the
// parents they reference, regardless of FK enforcement.
async function getDeleteOrder(prisma, tables) {
  const referencedTables = {}
  for (const name of tables) {
    const foreignKeys = await prisma.$queryRawUnsafe(`PRAGMA foreign_key_list("${name}")`)
    referencedTables[name] = [...new Set(foreignKeys.map(fk => fk.table))].filter(
      t => tables.includes(t) && t !== name
    )
  }

  const referencedByCount = Object.fromEntries(tables.map(t => [t, 0]))
  for (const name of tables) {
    for (const referenced of referencedTables[name]) {
      referencedByCount[referenced]++
    }
  }

  const queue = tables.filter(t => referencedByCount[t] === 0)
  const order = []
  while (queue.length) {
    const name = queue.shift()
    order.push(name)
    for (const referenced of referencedTables[name]) {
      referencedByCount[referenced]--
      if (referencedByCount[referenced] === 0) queue.push(referenced)
    }
  }
  // Any tables left over are part of a foreign key cycle - append them in
  // whatever order remains as a best effort.
  for (const name of tables) {
    if (!order.includes(name)) order.push(name)
  }

  return order
}

async function resetAllData(prisma) {
  const tables = (await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
  )).map(t => t.name)

  const deleteOrder = await getDeleteOrder(prisma, tables)
  for (const name of deleteOrder) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${name}"`)
  }
  // Reset autoincrement counters so IDs restart at 1, matching what a fresh
  // `db push --force-reset` produces (some seed helpers hardcode expected IDs).
  await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence')
}

module.exports = { resetAllData }
