const statuses = require('../../app/data/case-statuses')
const charges = require('../../app/data/charges')
const palmerMaterial = require('../../app/data/palmer-material')
const elementsByChargeCode = require('../../app/data/elements')
const { findParagraphOccurrence } = require('./case-review-annotations')

// R v Daniel Palmer - a domestic ABH against Chloe Barrett on 2 November 2024,
// built from the realistic material in app/data/palmer-material. Used by the
// charging-decision cases so the people on the case match the people in the
// material: defendant Daniel Palmer, victim Chloe Barrett, and police witnesses
// Imran Shah (arresting officer), Nicola Burke (injury photos) and Callum Rees
// (officer in the case).

const PALMER_CHARGE = charges.find(charge => charge.code === 'A02')
const PALMER_OFFENCE_DATE = new Date('2024-11-02')

const PALMER_LOCATION = {
  name: '22 Bellhaven Close',
  line1: '22 Bellhaven Close',
  line2: '',
  town: 'Liverpool',
  postcode: 'L2 2YY'
}

const PALMER_WITNESSES = [
  {
    firstName: 'Chloe',
    lastName: 'Barrett',
    gender: 'Female',
    dateOfBirth: new Date('1991-09-08'),
    isVictim: true,
    isKeyWitness: true,
    addressLine1: '22 Bellhaven Close',
    addressTown: 'Liverpool',
    addressPostcode: 'L2 2YY',
    homeNumber: '0151 888888',
    mobileNumber: '07981 888888',
    acroConvictions: false,
    statements: [
      { number: 1, receivedDate: new Date('2024-11-02') }
    ]
  },
  {
    firstName: 'Imran',
    lastName: 'Shah',
    gender: 'Male',
    isPolice: true,
    workNumber: '0151 555555',
    mobileNumber: '07981 555555',
    emailAddress: 'imran.shah@merseyside-police.example.com',
    statements: [
      { number: 3, receivedDate: new Date('2024-11-08') }
    ]
  },
  {
    firstName: 'Nicola',
    lastName: 'Burke',
    gender: 'Female',
    isPolice: true,
    workNumber: '0151 666666',
    mobileNumber: '07981 666666',
    emailAddress: 'nicola.burke@merseyside-police.example.com',
    statements: [
      { number: 2, receivedDate: new Date('2024-11-02') }
    ]
  },
  {
    firstName: 'Callum',
    lastName: 'Rees',
    gender: 'Male',
    isPolice: true,
    workNumber: '0151 777777',
    mobileNumber: '07981 777777',
    emailAddress: 'callum.rees@merseyside-police.example.com',
    statements: [
      { number: 1, receivedDate: new Date('2025-03-16') },
      { number: 4, receivedDate: new Date('2024-12-18') },
      { number: 5, receivedDate: new Date('2025-01-29') }
    ]
  }
]

// One reasoning per A02 element, in element order.
const PALMER_ELEMENT_REASONINGS = [
  'The victim describes being pulled from the fridge by her hair and slapped repeatedly, and her account is consistent with the CAD report and the WhatsApp messages recovered from Palmer’s phone.',
  'Pulling the victim to the floor, slapping her with both hands and biting her chin are deliberate acts, and Palmer admits losing his temper and smashing a glass.',
  'Two black eyes, bruising to both forearms and a bite mark to the chin were photographed by PC Burke and seen by PC Shah within hours of the incident.',
  'The injuries match the assault the victim describes and are not explained by Palmer’s account that she fell from the fridge, so the force he used caused the actual bodily harm she suffered.'
]

const PALMER_REVIEW_SUMMARY = 'Reviewed all material on the case file. The victim gives a clear and consistent account which is supported by the CAD report, the photographs of her injuries taken by PC Burke and the WhatsApp messages recovered from Palmer’s phone. Palmer denies the assault but offers no credible explanation for the injuries. Each element of the offence is made out and there is a realistic prospect of conviction. Prosecution is required in the public interest given the seriousness of the offence and its domestic context.'

// Annotations for the seeded in-progress review, anchored to exact substrings
// of the real document content in app/data/palmer-material/content.js.
// elementIndex refers to the A02 elements in order; null means no element link.
const PALMER_ANNOTATIONS = [
  {
    documentName: 'Chloe BARRETT statement 1 02-11-2024',
    type: 'evidence',
    elementIndex: 0,
    selectedText: 'pulling my hair whilst I have been stood up on the fridge and he has pulled me down to the floor',
    note: 'The victim describes being pulled to the floor by her hair.'
  },
  {
    documentName: 'Chloe BARRETT statement 1 02-11-2024',
    type: 'evidence',
    elementIndex: 2,
    selectedText: 'he has slapped me with a high level of force and has left me with two black eyes',
    note: 'The slaps caused two black eyes.'
  },
  {
    documentName: 'Chloe BARRETT statement 1 02-11-2024',
    type: 'evidence',
    elementIndex: 1,
    selectedText: 'he has slapped me to the face multiple times with him using both hands',
    note: 'Slapping the victim multiple times with both hands, rather than a single accidental blow, shows the assault was deliberate.'
  },
  {
    documentName: 'Chloe BARRETT statement 1 02-11-2024',
    type: 'note',
    elementIndex: null,
    selectedText: 'COME AND PICK UP YOUR DAUGHTER IF YOU DON’T WANT TO LOSE ANOTHER KID',
    note: 'Message to the victim’s mother — consider whether a threats to kill charge is appropriate.'
  },
  {
    documentName: 'Nicola BURKE statement 2 02-11-2024',
    type: 'evidence',
    elementIndex: 2,
    selectedText: 'she had two black eyes both were dark with bruising on the side',
    note: 'Injuries seen and photographed by PC Burke on the morning of the incident.'
  },
  {
    documentName: 'Nicola BURKE statement 2 02-11-2024',
    type: 'evidence',
    elementIndex: 3,
    selectedText: 'the injuries she had appeared to be very recent',
    note: 'The injuries were fresh when seen hours after the assault, linking them to Palmer’s attack rather than any other cause.'
  },
  {
    documentName: 'Imran SHAH statement 3 08-11-2024',
    type: 'note',
    elementIndex: null,
    selectedText: 'Two phones were found as a result of the search which have been seized',
    note: 'Records the arrest and seizure of the two phones (MP/01 and MP/02).'
  },
  {
    documentName: 'Callum REES statement 4 18-12-2024',
    type: 'evidence',
    elementIndex: 0,
    selectedText: 'YOU BIT MY CHIN I GOT A BLACK EYE NO NEED FOR IT',
    note: 'Contemporaneous WhatsApp message in which the victim accuses Palmer and he does not deny the assault.'
  },
  {
    documentName: 'Callum REES statement 4 18-12-2024',
    type: 'disclosure',
    elementIndex: null,
    selectedText: 'him accusing her of cheating on him prior to the incident taking place',
    note: 'Messages sent after the incident may assist the defence and should be disclosed.'
  },
  {
    documentName: 'MG15 - Record of interview',
    type: 'disclosure',
    elementIndex: null,
    selectedText: 'Off of a little fridge and it was very hard to pick her up',
    note: 'Palmer’s account that the victim fell from the fridge may support his defence and should be disclosed.'
  },
  {
    documentName: 'MG15 - Record of interview',
    type: 'evidence',
    elementIndex: 2,
    selectedText: 'That one she has got a black eye and … two black eyes',
    note: 'Palmer accepts the photographs show two black eyes and bruising.'
  },
  {
    documentName: 'MG6C - Item 01 CAD event report MEP-71298346-5521 redacted',
    type: 'evidence',
    elementIndex: 0,
    selectedText: 'PUSHED ME OFF THE FRIDGE AND SLAPPED ME THEN BIT MY CHIN',
    note: 'The victim’s first account to the 999 operator matches her statement.'
  },
  {
    documentName: 'Police report',
    type: 'evidence',
    elementIndex: 2,
    selectedText: 'two black eyes, bruises on her forearms and a small red mark on her chin',
    note: 'Injuries witnessed by the attending officer shortly after the incident.'
  },
  {
    documentName: 'Previous convictions',
    type: 'note',
    elementIndex: null,
    selectedText: 'COMMON ASSAULT ON 08/08/15 (PLEA:GUILTY)',
    note: 'Previous conviction for common assault — consider a bad character application.'
  },
  {
    documentName: 'WK-01 - PHOTO INJURIES TO ARMS - BURKE, Nicola',
    type: 'evidence',
    elementIndex: 2,
    selectedText: 'Whole photo',
    note: 'Photograph of bruising to both forearms.'
  },
  {
    documentName: 'WK-02 - PHOTO INJURY TO FACE SHOWING BLACK EYES',
    type: 'evidence',
    elementIndex: 2,
    selectedText: 'Whole photo',
    note: 'Photograph showing two black eyes.'
  },
  {
    documentName: 'WK-04 Injury to Eye - BURKE, Nicola',
    type: 'evidence',
    elementIndex: 2,
    selectedText: 'Whole photo',
    note: 'Photograph of the black eye and mark to the left side of the face.'
  },
  {
    documentName: 'SH-01 - MESSAGE TO CHLOE MUM FROM PALMER',
    type: 'note',
    elementIndex: null,
    selectedText: 'Whole photo',
    note: 'Message sent to the victim’s mother minutes after the incident — consider threats to kill.'
  },
  {
    documentName: 'SH-02 - COMMUNICATION BETWEEN VICTIM AND PALMER',
    type: 'evidence',
    elementIndex: 0,
    selectedText: 'Whole photo',
    note: 'WhatsApp conversation in which the victim accuses Palmer and he does not deny hitting her.'
  },
  {
    documentName: 'SH-03 999 Recording MG0 MME',
    type: 'evidence',
    elementIndex: 0,
    selectedText: '00:04',
    timestampSeconds: 4,
    note: 'The victim reports the assault to the 999 operator.'
  }
]

async function findOrCreatePalmerDefenceLawyer(prisma) {
  const existing = await prisma.defenceLawyer.findFirst({
    where: { firstName: 'Priya', lastName: 'Naidu' }
  })
  if (existing) return existing

  return prisma.defenceLawyer.create({
    data: { firstName: 'Priya', lastName: 'Naidu', organisation: 'Duty solicitor' }
  })
}

async function findOrCreatePalmerVictim(prisma) {
  const existing = await prisma.victim.findFirst({
    where: { firstName: 'Chloe', lastName: 'Barrett' }
  })
  if (existing) return existing

  return prisma.victim.create({
    data: { firstName: 'Chloe', lastName: 'Barrett' }
  })
}

async function findPalmerPoliceUnit(prisma) {
  return prisma.policeUnit.findUnique({ where: { name: 'Merseyside Police' } })
}

async function createPalmerDefendant(prisma, { hasCharge = true, firstName = 'Daniel', lastName = 'Palmer' } = {}) {
  const defenceLawyer = await findOrCreatePalmerDefenceLawyer(prisma)

  return prisma.defendant.create({
    data: {
      firstName,
      lastName,
      gender: 'Male',
      dateOfBirth: new Date('1988-03-14'),
      occupation: 'Mechanic',
      remandStatus: null,
      status: statuses.NOT_CHARGED,
      needsReview: true,
      defenceLawyer: { connect: { id: defenceLawyer.id } },
      ...(hasCharge ? {
        charges: {
          create: {
            chargeCode: PALMER_CHARGE.code,
            description: PALMER_CHARGE.description,
            status: 'Pre-charge',
            offenceDate: PALMER_OFFENCE_DATE,
            plea: null,
            isCount: false
          }
        }
      } : {})
    },
    include: { charges: true }
  })
}

async function createPalmerWitnesses(prisma, caseId) {
  for (const { statements, ...witnessData } of PALMER_WITNESSES) {
    const witness = await prisma.witness.create({
      data: {
        ...witnessData,
        preferredLanguage: 'English',
        isCpsContactAllowed: true,
        isRelevant: true,
        isAppearingInCourt: null,
        dcf: false,
        caseId
      }
    })

    for (const statement of statements) {
      await prisma.witnessStatement.create({
        data: {
          witnessId: witness.id,
          number: statement.number,
          receivedDate: statement.receivedDate,
          isUsedAsEvidence: true,
          isMarkedAsSection9: null
        }
      })
    }
  }
}

async function createPalmerDocuments(prisma, caseId) {
  await prisma.document.createMany({
    data: palmerMaterial.documents.map(({ images, ...document }) => ({ ...document, caseId }))
  })
}

// Builds a full case review on top of the Palmer material - elements
// assessed as strong, a written summary, every document marked reviewed and
// annotated. The curated text (summary, element reasoning, annotation notes)
// names Palmer by default; pass a different `lastName` to reuse the same
// material for a different defendant without misnaming them.
async function createFullPalmerReview(prisma, { caseId, userId, defendant, status, lastName = 'Palmer', includeChargeDecision = false }) {
  const elements = []
  const elementDescriptions = elementsByChargeCode[defendant.charges[0].chargeCode]
  for (const [index, description] of elementDescriptions.entries()) {
    const element = await prisma.element.create({
      data: {
        chargeId: defendant.charges[0].id,
        description,
        order: index,
        strength: 'Strong',
        strengthReasoning: PALMER_ELEMENT_REASONINGS[index].replaceAll('Palmer', lastName)
      }
    })
    elements.push(element)
  }

  const review = await prisma.caseReview.create({
    data: {
      caseId,
      userId,
      status,
      summary: PALMER_REVIEW_SUMMARY.replaceAll('Palmer', lastName),
      summaryComplete: true,
      chargingDecisionComplete: true,
      strengthAssessmentComplete: true,
      wantsInformationRequest: 'no',
      informationRequestComplete: true,
      ...(includeChargeDecision ? {
        chargeDecisions: {
          create: { chargeId: defendant.charges[0].id, decision: 'Charge' }
        }
      } : {})
    }
  })

  const documents = await prisma.document.findMany({ where: { caseId } })

  for (const document of documents) {
    const docReview = await prisma.caseReviewDocument.create({
      data: { caseReviewId: review.id, documentId: document.id, status: 'reviewed' }
    })

    const annotations = PALMER_ANNOTATIONS.filter(annotation => annotation.documentName === document.name)

    for (const snippet of annotations) {
      const element = snippet.elementIndex != null ? elements[snippet.elementIndex] : null
      const { paragraphIndex, occurrenceIndex } = findParagraphOccurrence(document, snippet.selectedText)
      const note = snippet.note.replaceAll('Palmer', lastName)

      const annotation = await prisma.caseReviewAnnotation.create({
        data: {
          caseReviewDocumentId: docReview.id,
          type: snippet.type,
          selectedText: snippet.selectedText,
          paragraphIndex,
          occurrenceIndex,
          note: element ? `${element.description}: ${note}` : note,
          timestampSeconds: snippet.timestampSeconds ?? null
        }
      })

      if (element) {
        await prisma.caseReviewAnnotationElement.create({
          data: {
            annotationId: annotation.id,
            elementId: element.id,
            reasoning: note
          }
        })
      }
    }
  }

  return review
}

module.exports = {
  PALMER_CHARGE,
  PALMER_OFFENCE_DATE,
  PALMER_LOCATION,
  PALMER_ELEMENT_REASONINGS,
  PALMER_REVIEW_SUMMARY,
  PALMER_ANNOTATIONS,
  findOrCreatePalmerVictim,
  findPalmerPoliceUnit,
  createPalmerDefendant,
  createPalmerWitnesses,
  createPalmerDocuments,
  createFullPalmerReview
}
