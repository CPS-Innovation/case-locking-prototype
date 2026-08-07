const prisma = require('../lib/prisma')
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

const evidence = [
  {
    title: "CCTV footage places defendant at scene at 9:47pm",
    detail: "High-definition footage from the off-licence on King Street shows the defendant entering at 9:47pm and leaving at 9:53pm.",
    source: { text: "CCTV — King Street off-licence (14 March 2026)", href: "#" }
  },
  {
    title: "DNA match on discarded glove found 30 metres from scene",
    detail: "Forensic analysis returned a full 17-loci DNA profile matching the defendant. The glove also contained traces of the victim's blood.",
    source: { text: "Forensic science report — LGC ref FSR-2026-04471", href: "#" }
  },
  {
    title: "Mobile phone cell data places defendant within 500 metres of scene",
    detail: "Cell site analysis of the defendant's phone shows it connecting to the mast on Barker Road between 9:40pm and 10:05pm."
  },
  {
    title: "Eyewitness identification at identity parade",
    detail: "A witness who lives opposite the scene picked out the defendant at a formal identification parade conducted on 14 March 2026.",
    source: { text: "Witness statement — J. Okafor (VIDREC/2026/0041)", href: "#" }
  },
  {
    title: "Text messages sent to co-defendant planning the offence",
    detail: "Messages recovered from the defendant's phone on 3 March 2026 reference a plan to 'sort it out on Friday' and ask about 'the stuff'.",
    source: { text: "Digital forensics report — phone extraction ref DF-26-1182", href: "#" }
  },
  {
    title: "Defendant's fingerprints found on the victim's vehicle",
    detail: "Fingerprint examination of the victim's car door identified a partial print from the defendant's right index finger."
  },
  {
    title: "Defendant made no comment in interview despite being shown CCTV",
    detail: "In a recorded interview on 17 March 2026, the defendant declined to answer all questions after being shown the CCTV stills.",
    source: { text: "Interview record — PACE interview transcript 17/03/2026", href: "#" }
  },
  {
    title: "Previous conviction for similar offence in 2021",
    detail: "The defendant received a 14-month suspended sentence in 2021 for an offence of the same type at a location three streets away."
  }
]

module.exports = router => {
  router.get('/cases/:caseId/key-evidence', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    let _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        witnesses: { include: { statements: true } },
        prosecutors: { include: { user: true } },
        paralegalOfficers: { include: { user: true } },
        defendants: { include: { charges: true } },
        hearings: true,
        location: true,
        tasks: true,
        dga: true
      }
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    res.render('cases/key-evidence/index', { _case, evidence })
  })
}
