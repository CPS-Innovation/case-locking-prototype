const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const firstNames = require('../../app/data/first-names.js');
const lastNames = require('../../app/data/last-names.js');

const UNIT_IDS = [9, 11, 13, 18]; // North Yorkshire Magistrates Court, South Yorkshire Magistrates Court, West Yorkshire Magistrates Court, Humberside Magistrates Court

async function seedSimonColleagues(prisma) {
  const colleaguesData = [];

  for (let i = 0; i < 20; i++) {
    const firstName = faker.helpers.arrayElement(firstNames);
    const lastName = faker.helpers.arrayElement(lastNames);
    colleaguesData.push({
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.sw-p${i}@example.com`,
      password: 'password123',
      role: 'Prosecutor',
      firstName,
      lastName
    });
  }

  for (let i = 0; i < 20; i++) {
    const firstName = faker.helpers.arrayElement(firstNames);
    const lastName = faker.helpers.arrayElement(lastNames);
    colleaguesData.push({
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.sw-po${i}@example.com`,
      password: 'password123',
      role: 'Paralegal officer',
      firstName,
      lastName
    });
  }

  const hashedData = await Promise.all(
    colleaguesData.map(async (u) => ({
      ...u,
      password: await bcrypt.hash(u.password, 10)
    }))
  );

  const created = await prisma.user.createManyAndReturn({ data: hashedData });

  for (const user of created) {
    await prisma.userUnit.createMany({
      data: UNIT_IDS.map(unitId => ({ userId: user.id, unitId }))
    });
  }

  return {
    prosecutors: created.filter(u => u.role === 'Prosecutor'),
    paralegalOfficers: created.filter(u => u.role === 'Paralegal officer')
  };
}

module.exports = { seedSimonColleagues };
