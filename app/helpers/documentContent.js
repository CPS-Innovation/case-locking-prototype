const palmerMaterial = require('../data/palmer-material')

const templates = {
  policeReport: [
    {
      heading: 'Background and circumstances',
      paragraphs: [
        'Officers were dispatched to the scene following a call received at 21:34 hours on 14 March 2026. Upon arrival, the officer in the case, Detective Constable Mark Rees, observed signs of a disturbance at the premises known as 47 Kelloway Road, Birmingham.',
        'A witness at the scene, who did not wish to be identified at that stage, indicated that the suspect had been present at the premises for approximately two hours prior to the incident. Officers conducted an initial assessment of the scene and secured the immediate area.',
        'The defendant was identified following CCTV review and subsequent intelligence checks conducted overnight on 14–15 March 2026. A formal identification was made at 07:12 hours on 15 March 2026 by DC Rees.'
      ]
    },
    {
      heading: 'Evidence gathered at scene',
      paragraphs: [
        'Scene of crime officers attended at approximately 23:00 hours on 14 March 2026. Photographic evidence was taken of the premises, including the point of entry, interior rooms and items of evidentiary interest.',
        'Items seized include: one mobile telephone (Nokia, black, IMEI ending 4421), one wallet containing bank cards in the name of the complainant, and clothing fibres recovered from the rear window frame consistent with entry at that point.',
        'A DNA swab was taken from the window frame area. The sample has been submitted for expedited analysis and results are expected within ten working days. The chain of custody for all exhibits is documented in Form MG21.'
      ]
    },
    {
      heading: 'Interview summary',
      paragraphs: [
        'The defendant was arrested at his home address at 09:45 hours on 16 March 2026 and conveyed to Steelhouse Lane custody suite. A contemporaneous note was made by the arresting officer, PC Sarah Hobbs.',
        'The defendant was interviewed under caution at 14:20 hours on 16 March 2026 and was represented throughout by duty solicitor Mr James Fenton of Fenton and Associates.',
        'During interview, the defendant made no comment to all questions put. The full interview record is contained in Form MG15 and the audio recording has been retained as an exhibit.'
      ]
    },
    {
      heading: 'Recommendation',
      paragraphs: [
        'In the opinion of the investigating officer, there is sufficient evidence to charge the defendant with the offence as described. The full evidential package, including witness statements, forensic results and CCTV exhibits, is submitted with this report.',
        'The investigating officer requests a charging decision at the earliest opportunity. The defendant is currently on conditional bail with conditions expiring on 15 April 2026.'
      ]
    }
  ],

  witnessStatement: [
    {
      heading: 'Statement of witness',
      paragraphs: [
        'This statement (consisting of 2 pages each signed by me) is true to the best of my knowledge and belief and I make it knowing that, if it is tendered in evidence, I shall be liable to prosecution if I have wilfully stated in it anything which I know to be false or do not believe to be true.',
        'I am 34 years of age and reside at an address known to police. I am employed as a customer services manager. I have known the defendant by sight for approximately three years, having seen him in the local area on multiple occasions.'
      ]
    },
    {
      heading: 'Account of events',
      paragraphs: [
        'On the evening of 14 March 2026, I was walking along King Street in the direction of the town centre at approximately 21:15 hours. The weather was dry and clear. Street lighting was operational and visibility was good.',
        'As I passed the junction with Maple Avenue, I observed two males in a heated exchange outside the entrance to a convenience store. I recognised the defendant as one of the two men. He was wearing a dark hooded jacket and light-coloured jeans.',
        'I witnessed the defendant push the other male, causing him to stumble backwards and fall against the shop window. The defendant then reached into his jacket. I was approximately 12 metres away and had a clear, unobstructed view of the incident.',
        'I immediately called 999 and remained at the scene until officers arrived. I was shown a photograph by officers on 16 March 2026 and confirmed that the male depicted was the same person I had seen on the evening of 14 March 2026.'
      ]
    },
    {
      heading: 'Additional information',
      paragraphs: [
        'I am willing to attend court to give evidence in this matter. I have no connection with either party beyond what I have described above.',
        'I have read the above statement and it is true and accurate to the best of my knowledge and belief. Signed and dated 17 March 2026.'
      ]
    }
  ],

  cctvReport: [
    {
      heading: 'CCTV review — King Street, Birmingham',
      paragraphs: [
        'This report summarises the review of CCTV footage retrieved from two camera systems installed in the King Street area of Birmingham city centre. The footage was retrieved on 15 March 2026 by Detective Constable Sarah Hobbs and PC Aaron Webb.',
        'Camera 1 is positioned on the exterior of the convenience store at 112 King Street, covering the entrance and the pavement directly outside. Camera 2 is a local authority camera mounted on a pole at the junction of King Street and Maple Avenue, covering a wider field of view.'
      ]
    },
    {
      heading: 'Summary of footage reviewed',
      paragraphs: [
        'Camera 1 — 20:50–21:45 hours, 14 March 2026: At 21:17:43, a male matching the description of the defendant is observed approaching the store entrance from the south. He is wearing a dark hooded jacket and light-coloured jeans.',
        'At 21:19:02, a second male approaches. An altercation is visible between the two males. At 21:19:34, the defendant pushes the second male, who falls against the shop window. The defendant is then seen to reach inside his jacket before turning and walking northwards along King Street.',
        'Camera 2 — 21:15–21:35 hours, 14 March 2026: The defendant is visible entering the frame from the south at 21:16:58. He can be tracked walking along King Street until he enters the convenience store at 21:17:55. Following the incident, the defendant is tracked leaving the area northwards at 21:20:11.'
      ]
    },
    {
      heading: 'Image quality and continuity',
      paragraphs: [
        'The footage from Camera 1 is of sufficient quality to identify the defendant. The reviewing officer has compared the footage with custody photographs taken of the defendant on 16 March 2026 and is satisfied that the male depicted is the defendant.',
        'The footage from Camera 2 is of lower resolution but is consistent with the Camera 1 footage in terms of timing and movement. There are no gaps or interruptions in the footage during the relevant period.',
        'Digital copies of both recordings have been made and stored as exhibits. The originals remain with the respective system operators pending any further request.'
      ]
    }
  ],

  forensicReport: [
    {
      heading: 'Case reference and submission details',
      paragraphs: [
        'Submission reference: FOR-2026-03-1147. Items were received at the laboratory on 16 March 2026 from West Midlands Police, submitted by DC Mark Rees, CID, Handsworth.',
        'Items submitted for examination: one DNA swab (Exhibit MR/01), one clothing item — dark hooded jacket (Exhibit SH/03), one partial fingerprint lift (Exhibit SH/07).'
      ]
    },
    {
      heading: 'DNA analysis — Exhibit MR/01',
      paragraphs: [
        'A DNA profile was obtained from the swab taken from the window frame at the scene. The profile is a full single-source profile suitable for comparison purposes.',
        'The DNA profile obtained from Exhibit MR/01 was compared against the reference sample provided by the defendant (Exhibit MR/04). The profiles match at all 20 loci examined.',
        'The probability of obtaining this profile from a person unrelated to the defendant, chosen at random from the UK population, is approximately 1 in 1 billion. This is a match to a very high degree of scientific certainty.'
      ]
    },
    {
      heading: 'Textile fibre analysis — Exhibit SH/03',
      paragraphs: [
        'Fibre samples were taken from the jacket submitted as Exhibit SH/03. A comparison was made between these fibres and trace fibres recovered from the window frame (Exhibit SH/06).',
        'Fibres recovered from the window frame are consistent in colour, fibre type and construction with those from the jacket. This is consistent with the jacket having been in contact with the window frame, though it does not exclude other explanations.',
        'Full analytical data and microscopy images are appended to this report as Annex A.'
      ]
    },
    {
      heading: 'Fingerprint analysis — Exhibit SH/07',
      paragraphs: [
        'A partial fingerprint was lifted from the interior window sill of the property. The print was of sufficient quality for comparison purposes.',
        'The print was compared against the ten-print set taken from the defendant on 16 March 2026. The print is identified as the right index fingerprint of the defendant.',
        'This identification was verified by a second qualified fingerprint officer in accordance with standard operating procedures.'
      ]
    }
  ],

  interviewTranscript: [
    {
      heading: 'Custody details',
      paragraphs: [
        'Interview conducted at Steelhouse Lane Police Station. Date: 16 March 2026. Interview commenced: 14:20. Interview concluded: 15:08.',
        'Present: Detective Constable Mark Rees (interviewing officer), Detective Constable Sarah Hobbs (second officer), Mr James Fenton (solicitor representing the defendant).',
        'The defendant was advised of his right to legal advice, which he had exercised. He was reminded of the caution at the commencement of the interview.'
      ]
    },
    {
      heading: 'Interview — opening',
      paragraphs: [
        'DC Rees: I am going to ask you some questions about events that took place on the evening of 14 March 2026 in the King Street area of Birmingham. You are still under caution. You do not have to say anything, but it may harm your defence if you do not mention when questioned something which you later rely on in court. Anything you do say may be given in evidence. Do you understand?',
        'Defendant: No comment.',
        'DC Rees: Were you in the King Street area of Birmingham on the evening of 14 March 2026?',
        'Defendant: No comment.',
        'DC Rees: We have CCTV footage that shows a male matching your description in King Street at 21:17. What do you say about that?',
        'Defendant: No comment.'
      ]
    },
    {
      heading: 'Interview — key questions',
      paragraphs: [
        'DC Rees: I am going to show you a still image taken from CCTV footage. This is exhibit MR/02. Do you recognise the male shown in this image?',
        'Defendant: No comment.',
        'DC Rees: We have a witness who says they saw you involved in an altercation outside 112 King Street. What do you say about that?',
        'Defendant: No comment.',
        'DC Rees: We have recovered your DNA from the window frame of the property at 47 Kelloway Road. How did your DNA come to be there?',
        'Defendant: No comment.',
        'DC Rees: I have nothing further to ask. Is there anything you would like to add?',
        'Defendant: No comment.'
      ]
    },
    {
      heading: 'Close of interview',
      paragraphs: [
        'The interview was concluded at 15:08. The defendant was reminded that he remained under caution. The defendant was returned to the custody area.',
        'Interview tapes were sealed in the presence of the defendant and his solicitor. The master copy was handed to the custody officer as exhibit MR/10.'
      ]
    }
  ],

  medicalReport: [
    {
      heading: 'Patient details and attendance',
      paragraphs: [
        'Patient: [Redacted — known to officers]. Date of attendance: 14 March 2026, 23:47 hours. Attending clinician: Dr Anika Sharma, MBBS, Emergency Medicine Registrar, Birmingham City Hospital.',
        'The patient was brought to the Emergency Department by ambulance following an incident in King Street, Birmingham. Police were present at the scene and accompanied the patient to hospital.'
      ]
    },
    {
      heading: 'Presenting complaints and examination findings',
      paragraphs: [
        'The patient presented with pain to the right shoulder and posterior scalp following a fall. The patient reported being pushed by a third party, causing them to fall against a glass window.',
        'On examination: a 3cm laceration was observed to the right posterior scalp with associated bruising. There was tenderness and restricted range of motion in the right shoulder. No bony abnormality was palpated. Pupils equal and reactive to light. GCS 15/15 throughout.',
        'Skull X-ray showed no fracture. Right shoulder X-ray showed no fracture or dislocation. The laceration was cleaned and closed with three sutures under local anaesthetic.'
      ]
    },
    {
      heading: 'Clinical opinion',
      paragraphs: [
        'The injuries observed are consistent with the history of a fall against a hard surface. The pattern of injury is consistent with a person being pushed from behind and falling laterally.',
        'The injuries are not life-threatening. The patient was discharged at 02:30 hours on 15 March 2026 with advice to attend GP if symptoms worsen. A follow-up appointment has been arranged for suture removal.',
        'This report has been prepared at the request of West Midlands Police and may be used for evidential purposes. It reflects my professional opinion to the best of my clinical knowledge.'
      ]
    }
  ]
}

function selectTemplate(documentName) {
  const lower = documentName.toLowerCase()
  if (lower.includes('witness statement')) return templates.witnessStatement
  if (lower.includes('cctv')) return templates.cctvReport
  if (lower.includes('forensic') || lower.includes('lab result')) return templates.forensicReport
  if (lower.includes('interview transcript')) return templates.interviewTranscript
  if (lower.includes('medical')) return templates.medicalReport
  return templates.policeReport
}

function generateDocumentContent(document) {
  return palmerMaterial.getContent(document.name) || selectTemplate(document.name)
}

function getDocumentPhotoUrls(document) {
  return palmerMaterial.getImages(document.name) || ['/public/images/evidence-photo-placeholder.jpg']
}

module.exports = { generateDocumentContent, getDocumentPhotoUrls }
