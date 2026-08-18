const { faker } = require("@faker-js/faker");
const elementsByChargeCode = require("../../app/data/elements.js");
const statuses = require("../../app/data/case-statuses.js");

// Seeds Element rows for every Charge in the database, using the legal
// elements defined per charge code in app/data/elements.js. Runs after
// all case-generation seeders so it picks up charges created anywhere in
// the seed process, without each seed-helper having to create them
// individually.
async function seedElements(prisma) {
  const charges = await prisma.charge.findMany({
    select: { id: true, chargeCode: true, defendant: { select: { status: true } } }
  });

  const rows = [];
  charges.forEach(charge => {
    const descriptions = elementsByChargeCode[charge.chargeCode];
    if (!descriptions) return;

    descriptions.forEach((description, index) => {
      const strength = charge.defendant.status === statuses.NOT_CHARGED
        ? "Not assessed"
        : faker.helpers.weightedArrayElement([
            { value: "Strong", weight: 3 },
            { value: "Weak", weight: 2 },
            { value: "Not assessed", weight: 3 }
          ]);

      rows.push({
        chargeId: charge.id,
        description,
        order: index,
        strength,
        strengthReasoning: strength !== "Not assessed" ? faker.lorem.sentence() : null
      });
    });
  });

  if (rows.length) {
    await prisma.element.createMany({ data: rows });
  }

  return rows.length;
}

module.exports = { seedElements };
