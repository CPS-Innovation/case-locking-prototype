// Canned annotation candidates used to seed reviewed/in-progress documents.
// Each selectedText is an exact substring of the matching template in
// app/helpers/documentContent.js, so the review page's highlight matching
// (which does a literal substring search) finds it.
module.exports = {
  policeReport: [
    {
      selectedText: 'clothing fibres recovered from the rear window frame consistent with entry at that point',
      type: 'evidence',
      note: 'Consistent with forensic fibre analysis linking the defendant to the point of entry.'
    },
    {
      selectedText: 'the defendant made no comment to all questions put',
      type: 'issue',
      note: 'No comment interview - full transcript must be disclosed to the defence.'
    },
    {
      selectedText: 'The full evidential package, including witness statements, forensic results and CCTV exhibits, is submitted with this report.',
      type: 'information-request',
      note: 'Confirm all referenced exhibits have been received from the OIC before review is finalised.'
    }
  ],

  witnessStatement: [
    {
      selectedText: 'I recognised the defendant as one of the two men. He was wearing a dark hooded jacket and light-coloured jeans.',
      type: 'evidence',
      note: 'Positive identification of the defendant by description of clothing.'
    },
    {
      selectedText: 'I witnessed the defendant push the other male, causing him to stumble backwards and fall against the shop window.',
      type: 'evidence',
      note: 'Direct eyewitness account of the assault.'
    },
    {
      selectedText: 'I have no connection with either party beyond what I have described above.',
      type: 'issue',
      note: 'Confirms witness has no conflict of interest - relevant to credibility.'
    }
  ],

  cctvReport: [
    {
      selectedText: 'the defendant pushes the second male, who falls against the shop window',
      type: 'evidence',
      note: 'Corroborates witness account of the push.'
    },
    {
      selectedText: 'The reviewing officer has compared the footage with custody photographs taken of the defendant on 16 March 2026 and is satisfied that the male depicted is the defendant.',
      type: 'evidence',
      note: 'Confirms identification of the defendant from the footage.'
    },
    {
      selectedText: 'The originals remain with the respective system operators pending any further request.',
      type: 'information-request',
      note: 'Request original recordings be secured in case continuity is challenged.'
    }
  ],

  forensicReport: [
    {
      selectedText: 'The profiles match at all 20 loci examined.',
      type: 'evidence',
      note: 'Full DNA match linking the defendant to the scene.'
    },
    {
      selectedText: 'Fibres recovered from the window frame are consistent in colour, fibre type and construction with those from the jacket.',
      type: 'evidence',
      note: 'Supports the presence of the defendant at the point of entry.'
    },
    {
      selectedText: 'Full analytical data and microscopy images are appended to this report as Annex A.',
      type: 'information-request',
      note: 'Ensure Annex A is included in the served evidence bundle.'
    }
  ],

  interviewTranscript: [
    {
      selectedText: 'We have recovered your DNA from the window frame of the property at 47 Kelloway Road. How did your DNA come to be there?',
      type: 'evidence',
      note: 'Confronts the defendant with the forensic evidence during interview.'
    },
    {
      selectedText: 'The defendant was advised of his right to legal advice, which he had exercised.',
      type: 'issue',
      note: 'Confirms interview was conducted with legal representation present.'
    },
    {
      selectedText: 'Interview tapes were sealed in the presence of the defendant and his solicitor.',
      type: 'information-request',
      note: 'Request access to the sealed master tape if continuity is challenged at trial.'
    }
  ],

  medicalReport: [
    {
      selectedText: 'a 3cm laceration was observed to the right posterior scalp with associated bruising',
      type: 'evidence',
      note: 'Documents injuries consistent with the account given by the victim of the assault.'
    },
    {
      selectedText: 'The pattern of injury is consistent with a person being pushed from behind and falling laterally.',
      type: 'evidence',
      note: 'Clinical opinion supports the mechanism of injury described by the witness.'
    },
    {
      selectedText: 'This report has been prepared at the request of West Midlands Police and may be used for evidential purposes.',
      type: 'issue',
      note: 'Confirms the report is disclosable and admissible as evidence.'
    }
  ],

  // Photos and videos have no underlying text to highlight, so their
  // annotations use generic notes instead of a matched selectedText.
  photo: [
    {
      type: 'evidence',
      note: 'Shows the defendant at the scene, matching the description given by witnesses.'
    },
    {
      type: 'issue',
      note: 'Confirms the presence of a third party visible in the background of the image.'
    },
    {
      type: 'information-request',
      note: 'Request the original, uncompressed image file from the OIC for continuity purposes.'
    }
  ],

  video: [
    {
      type: 'evidence',
      note: 'Shows a male matching the description given for the defendant at the relevant time.'
    },
    {
      type: 'issue',
      note: 'Confirms the timing is consistent with the account given by the witness.'
    },
    {
      type: 'information-request',
      note: 'Additional camera angle requested from the system operator to confirm continuity.'
    }
  ],

  audio: [
    {
      type: 'evidence',
      note: 'Caller describes the assault in progress, consistent with the witness account of the push.'
    },
    {
      type: 'issue',
      note: 'Timing of the call corroborates when the incident took place.'
    },
    {
      type: 'information-request',
      note: 'Request the full call log and any further calls made about the incident.'
    }
  ]
}
