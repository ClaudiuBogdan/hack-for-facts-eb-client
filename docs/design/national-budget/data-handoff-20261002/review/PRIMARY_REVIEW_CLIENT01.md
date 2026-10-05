# Prototype review — national budget client turn01

Both variants implement distinct information hierarchies and are suitable for design iteration. Do not promote or commit yet. Primary inspected the live Panorama and Questions/plan-execution states. Actualgpt-6-astra independently verified288approved/289executionrows byte-equal to handoff, monetaryscaling,explicitdescriptor selection,edition/targetyears,credit separation,draft/DEMO marks,noauthorityCUIguessing,plan-versus-execution differences withheld. Currentrealroutes remain unchanged.

Required small corrections:
1. model/comparability.ts interval matching ignores days. January1–July30 vsJanuary1–July31 must refuse. Preserve legitimate equal-calendar-interval comparisons acrossyears.
2. ReleasePicker must not state every source ends atmonth-end. Show knownJuly2006 printedcoverage throughJuly30;do not confuse storedmonthlybucketwithfiscal/reportcoverage. WithRelease must say noqualifiedreleaseavailable forheldaccounting/incompatiblesources,not nobulletinexists. Sourcegap wordinglimitedtoinspectedsourceabsence.
3. page.format.ts checkDetail basis same always returnsrevenuewording,evenforexpenditure budgetcredits/payments. Passactualbasis toexplanation;showexpensebasis correctly and retain no-ratio/version refusal.
4. Panorama chart label is hardcodedbudgetcredits despitecommitment toggle. Derivecreditlabel fromqueriedcreditType.
5. Panorama four-funds table mustnamechosenexpense descriptor,particularlyhealth5000TOTALGENERAL. Do not imply5005CHELTUIELI-TOTAL or independentlysettledfiscalannualtotal. Questionsalreadyshowsdescriptor.

Calendar241/6 is reconstructedfromcount/range+documentedgaps,notcopiedfromliveindividualselectionindex. Stateit inmockmetadata/report (counts verified; nofalsepermonthsourceIDs). No newproductionqueryrequired.

Design preference visibleinunsentterminaldraft:Ipreferpanorama;defaultexecutiontothelatestmonth. Awaithumanpermissionbeforeoverwritingorsubmittingdraft. KeepQuestionsprototypeforexperimentation;do notdelete/promoterealroutes. Existingdiagram/tablefoldingmobilelongnessisdesigntradeoffforlateriteration,notdatacorrectnessblock.

Targetedmodel/adapterregressions,visiblecreditlabel/expenseexplanation,July2006note,heldgapSSR/browserchecksandnormalyarncheck neededafterfix. Persistcheckoutputs orstructuredresultswithcommands/time inreport. Existing51testsreportedpass,keyboard17/17,a11y0,layout34renders;primaryreviewdoesnotclaimfullsuiteindependentlyrerun. No commit,push orAPIcontractfinalization.
