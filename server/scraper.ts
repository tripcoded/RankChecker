import puppeteer, { type Page } from 'puppeteer';
import { normalizeDob, normalizeRollNo, toPortalDob } from './normalizers.js';
import {
  getStudentWithSubjects,
  listSuccessfulStudents,
  saveScrapeError,
  saveScrapeResult,
} from './repository.js';
import { getBatchInfoFromRoll, getBatchNameFromCode } from './batch.js';

const RESULT_URL = process.env.RESULT_PORTAL_URL || 'https://ddugorakhpur.com/result2023/searchresult_new.aspx';
const FIXED_SEMESTER = process.env.RESULT_PORTAL_SEMESTER || '3';
const ALT_RESULT_URL = 'https://result.ddugu.ac.in/result2023/searchresult_new.aspx';
const NAV_TIMEOUT_MS = Number(process.env.SCRAPER_NAVIGATION_TIMEOUT_MS || 60000);
const SELECTOR_TIMEOUT_MS = Number(process.env.SCRAPER_SELECTOR_TIMEOUT_MS || 20000);
const SCRAPER_HEADLESS = process.env.SCRAPER_HEADLESS !== 'false';

export type ManualCredential = {
  rollNo: string;
  dob: string;
};
type ManualCredentialInput = ManualCredential | [string, string];

/**
 * Paste students here in this exact format:
 * { rollNo: '2514670010038', dob: '05-11-2006' }
 */
const MANUAL_CREDENTIAL_BATCH: ManualCredentialInput[] = [
{ rollNo: '2514670010001', dob: '18-11-2006' },
{ rollNo: '2514670010002', dob: '18-09-2008' },
{ rollNo: '2514670010003', dob: '28-08-2005' },
{ rollNo: '2514670010004', dob: '17-01-2004' },
{ rollNo: '2514670010005', dob: '29-03-2007' },
{ rollNo: '2514670010006', dob: '20-08-2006' },
{ rollNo: '2514670010007', dob: '14-06-2004' },
{ rollNo: '2514670010008', dob: '27-07-2003' },
{ rollNo: '2514670010009', dob: '26-05-2005' },
{ rollNo: '2514670010010', dob: '01-06-2006' },
{ rollNo: '2514670010011', dob: '14-01-2006' },
{ rollNo: '2514670010012', dob: '20-10-2006' },
{ rollNo: '2514670010013', dob: '01-06-2006' },
{ rollNo: '2514670010014', dob: '05-05-2006' },
{ rollNo: '2514670010015', dob: '19-02-2005' },
{ rollNo: '2514670010016', dob: '04-08-2005' },
{ rollNo: '2514670010017', dob: '29-11-2005' },
{ rollNo: '2514670010018', dob: '13-01-2007' },
{ rollNo: '2514670010019', dob: '12-03-2005' },
{ rollNo: '2514670010020', dob: '29-12-2005' },
{ rollNo: '2514670010021', dob: '11-11-2006' },
{ rollNo: '2514670010022', dob: '22-07-2005' },
{ rollNo: '2514670010023', dob: '17-09-2006' },
{ rollNo: '2514670010024', dob: '25-06-2005' },
{ rollNo: '2514670010025', dob: '03-04-2005' },
{ rollNo: '2514670010026', dob: '10-02-2006' },
{ rollNo: '2514670010027', dob: '12-05-2006' },
{ rollNo: '2514670010028', dob: '18-10-2005' },
{ rollNo: '2514670010029', dob: '21-07-2008' },
{ rollNo: '2514670010030', dob: '29-08-2007' },
{ rollNo: '2514670010031', dob: '01-01-2006' },
{ rollNo: '2514670010032', dob: '05-01-2007' },
{ rollNo: '2514670010033', dob: '03-04-2007' },
{ rollNo: '2514670010034', dob: '15-11-2006' },
{ rollNo: '2514670010035', dob: '02-07-2006' },
{ rollNo: '2514670010036', dob: '01-01-2006' },
{ rollNo: '2514670010037', dob: '01-05-2005' },
{ rollNo: '2514670010038', dob: '05-11-2006' },
{ rollNo: '2514670010039', dob: '02-01-2008' },
{ rollNo: '2514670010040', dob: '06-09-2004' },
{ rollNo: '2514670010041', dob: '09-08-2006' },
{ rollNo: '2514670010042', dob: '26-12-2003' },
{ rollNo: '2514670010043', dob: '27-06-2005' },
{ rollNo: '2514670010044', dob: '28-06-2004' },
{ rollNo: '2514670010045', dob: '20-06-2006' },
{ rollNo: '2514670010046', dob: '18-06-2007' },
{ rollNo: '2514670010047', dob: '13-09-2006' },
{ rollNo: '2514670010048', dob: '08-07-2007' },
{ rollNo: '2514670010049', dob: '25-12-2004' },
{ rollNo: '2514670010050', dob: '11-10-2007' },
{ rollNo: '2514670010051', dob: '20-08-2006' },
{ rollNo: '2514670010052', dob: '10-07-2004' },
{ rollNo: '2514670010053', dob: '14-04-2007' },
{ rollNo: '2514670010054', dob: '01-01-2007' },
{ rollNo: '2514670010055', dob: '18-04-2006' },
{ rollNo: '2514670010056', dob: '11-12-2005' },
{ rollNo: '2514670010057', dob: '27-02-2006' },
{ rollNo: '2514670010058', dob: '21-01-2005' },
{ rollNo: '2514670010059', dob: '22-12-2004' },
{ rollNo: '2514670010060', dob: '03-10-2006' },
{ rollNo: '2514670010061', dob: '22-12-2006' },
{ rollNo: '2514670010062', dob: '30-09-2006' },
{ rollNo: '2514670010063', dob: '06-12-2007' },
{ rollNo: '2514670010064', dob: '12-04-2006' },
{ rollNo: '2514670010065', dob: '29-08-2006' },
{ rollNo: '2514670010066', dob: '13-09-2005' },
{ rollNo: '2514670010067', dob: '06-02-2005' },
{ rollNo: '2514670010068', dob: '12-05-2006' },
{ rollNo: '2514670010069', dob: '23-02-2006' },
{ rollNo: '2514670010070', dob: '29-03-2008' },
{ rollNo: '2514670010071', dob: '25-12-2006' },
{ rollNo: '2514670010072', dob: '09-12-2005' },
{ rollNo: '2514670010073', dob: '25-02-2004' },
{ rollNo: '2514670010074', dob: '01-01-2008' },
{ rollNo: '2514670010075', dob: '14-08-2005' },
{ rollNo: '2514670010076', dob: '10-03-2005' },
{ rollNo: '2514670010077', dob: '06-04-2006' },
{ rollNo: '2514670010078', dob: '18-06-2007' },
{ rollNo: '2514670010079', dob: '14-08-2008' },
{ rollNo: '2514670010080', dob: '14-03-2006' },
{ rollNo: '2514670010081', dob: '01-02-2006' },
{ rollNo: '2514670010082', dob: '10-06-2005' },
{ rollNo: '2514670010083', dob: '13-02-2007' },
{ rollNo: '2514670010084', dob: '06-10-2003' },
{ rollNo: '2514670010085', dob: '07-05-2005' },
{ rollNo: '2514670010086', dob: '15-06-2006' },
{ rollNo: '2514670010087', dob: '30-08-2006' },
{ rollNo: '2514670010088', dob: '07-04-2005' },
{ rollNo: '2514670010089', dob: '19-07-2006' },
{ rollNo: '2514670010090', dob: '03-07-2005' },
{ rollNo: '2514670010091', dob: '10-07-2007' },
{ rollNo: '2514670010092', dob: '12-11-2006' },
{ rollNo: '2514670010093', dob: '13-05-2006' },
{ rollNo: '2514670010094', dob: '04-03-2006' },
{ rollNo: '2514670010095', dob: '07-03-2005' },
{ rollNo: '2514670010096', dob: '01-06-2006' },
{ rollNo: '2514670010097', dob: '07-04-2007' },
{ rollNo: '2514670010098', dob: '17-11-2005' },
{ rollNo: '2514670010099', dob: '07-04-2006' },
{ rollNo: '2514670010100', dob: '12-01-2006' },
{ rollNo: '2514670010101', dob: '01-01-2007' },
{ rollNo: '2514670010102', dob: '27-08-2006' },
{ rollNo: '2514670010103', dob: '21-12-2006' },
{ rollNo: '2514670010104', dob: '26-06-2005' },
{ rollNo: '2514670010105', dob: '23-11-2005' },
{ rollNo: '2514670010106', dob: '10-08-2005' },
{ rollNo: '2514670010107', dob: '02-11-2006' },
{ rollNo: '2514670010108', dob: '12-11-2005' },
{ rollNo: '2514670010109', dob: '05-05-2006' },
{ rollNo: '2514670010110', dob: '26-08-2005' },
{ rollNo: '2514670010111', dob: '29-07-2006' },
{ rollNo: '2514670010112', dob: '22-08-2005' },
{ rollNo: '2514670010113', dob: '06-12-2005' },
{ rollNo: '2514670010114', dob: '20-01-2006' },
{ rollNo: '2514670010115', dob: '27-02-2006' },
{ rollNo: '2514670010116', dob: '10-12-2005' },
{ rollNo: '2514670010117', dob: '08-08-2006' },
{ rollNo: '2514670010118', dob: '03-06-2007' },
{ rollNo: '2514670010119', dob: '09-02-2006' },

{ rollNo: '2514750010001', dob: '13-02-2006' },
{ rollNo: '2514750010002', dob: '17-11-2006' },
{ rollNo: '2514750010003', dob: '11-12-2006' },
{ rollNo: '2514750010004', dob: '15-07-2005' },
{ rollNo: '2514750010005', dob: '13-02-2007' },
{ rollNo: '2514750010006', dob: '28-09-2004' },
{ rollNo: '2514750010007', dob: '30-08-2005' },
{ rollNo: '2514750010008', dob: '10-08-2004' },
{ rollNo: '2514750010009', dob: '04-02-2006' },
{ rollNo: '2514750010010', dob: '01-02-2006' },
{ rollNo: '2514750010011', dob: '19-11-2006' },
{ rollNo: '2514750010012', dob: '10-03-2006' },
{ rollNo: '2514750010013', dob: '12-06-2003' },
{ rollNo: '2514750010014', dob: '19-07-2006' },
{ rollNo: '2514750010015', dob: '04-12-2007' },
{ rollNo: '2514750010016', dob: '25-11-2005' },
{ rollNo: '2514750010017', dob: '06-10-2006' },
{ rollNo: '2514750010018', dob: '01-06-2006' },
{ rollNo: '2514750010019', dob: '23-11-2006' },
{ rollNo: '2514750010020', dob: '08-04-2007' },
{ rollNo: '2514750010021', dob: '30-09-2006' },
{ rollNo: '2514750010022', dob: '14-10-2007' },
{ rollNo: '2514750010023', dob: '03-12-2005' },
{ rollNo: '2514750010024', dob: '13-06-2007' },
{ rollNo: '2514750010025', dob: '01-01-2005' },
{ rollNo: '2514750010026', dob: '17-02-2006' },
{ rollNo: '2514750010027', dob: '03-07-2006' },
{ rollNo: '2514750010028', dob: '03-05-2005' },
{ rollNo: '2514750010029', dob: '16-10-2005' },
{ rollNo: '2514750010030', dob: '01-01-2004' },
{ rollNo: '2514750010031', dob: '24-10-2006' },
{ rollNo: '2514750010032', dob: '02-07-2007' },
{ rollNo: '2514750010033', dob: '08-03-2007' },
{ rollNo: '2514750010034', dob: '03-11-2008' },
{ rollNo: '2514750010035', dob: '14-03-2005' },
{ rollNo: '2514750010036', dob: '20-11-2005' },
{ rollNo: '2514750010037', dob: '25-08-2005' },
{ rollNo: '2514750010038', dob: '07-06-2005' },
{ rollNo: '2514750010039', dob: '19-07-2005' },
{ rollNo: '2514750010040', dob: '21-01-2004' },
{ rollNo: '2514750010041', dob: '19-08-2005' },
{ rollNo: '2514750010042', dob: '03-01-2007' },
{ rollNo: '2514750010043', dob: '18-10-2005' },
{ rollNo: '2514750010044', dob: '14-11-2003' },
{ rollNo: '2514750010045', dob: '18-03-2006' },
{ rollNo: '2514750010046', dob: '15-03-2006' },
{ rollNo: '2514750010047', dob: '07-09-2008' },
{ rollNo: '2514750010048', dob: '02-06-2004' },
{ rollNo: '2514750010049', dob: '12-01-2006' },
{ rollNo: '2514750010050', dob: '08-03-2004' },
{ rollNo: '2514750010051', dob: '14-09-2005' },
{ rollNo: '2514750010052', dob: '16-02-2007' },
{ rollNo: '2514750010053', dob: '03-03-2006' },
{ rollNo: '2514750010054', dob: '10-08-2005' },
{ rollNo: '2514750010055', dob: '01-03-2006' },
{ rollNo: '2514750010056', dob: '17-05-2006' },
{ rollNo: '2514750010057', dob: '11-03-2006' },
{ rollNo: '2514750010058', dob: '18-11-2006' },
{ rollNo: '2514750010059', dob: '01-01-2007' },
{ rollNo: '2514750010060', dob: '03-03-2006' },
{ rollNo: '2514750010061', dob: '11-11-2005' },
{ rollNo: '2514750010062', dob: '29-04-2005' },
{ rollNo: '2514750010063', dob: '26-04-2004' },
{ rollNo: '2514750010064', dob: '12-07-2007' },
{ rollNo: '2514750010065', dob: '01-01-2006' },
{ rollNo: '2514750010066', dob: '19-11-2005' },
{ rollNo: '2514750010067', dob: '19-10-2007' },
{ rollNo: '2514750010068', dob: '01-01-2007' },
{ rollNo: '2514750010069', dob: '02-01-2007' },
{ rollNo: '2514750010070', dob: '13-07-2005' },
{ rollNo: '2514750010071', dob: '05-08-2005' },
{ rollNo: '2514750010072', dob: '10-08-2005' },
{ rollNo: '2514750010073', dob: '10-02-2006' },
{ rollNo: '2514750010074', dob: '04-04-2004' },
{ rollNo: '2514750010075', dob: '12-12-2003' },
{ rollNo: '2514750010076', dob: '17-04-2008' },
{ rollNo: '2514750010077', dob: '10-06-2003' },
{ rollNo: '2514750010078', dob: '24-09-2005' },
{ rollNo: '2514750010079', dob: '27-08-2005' },
{ rollNo: '2514750010080', dob: '04-11-2007' },
{ rollNo: '2514750010081', dob: '28-03-2004' },
{ rollNo: '2514750010082', dob: '30-06-2007' },
{ rollNo: '2514750010083', dob: '31-07-2005' },
{ rollNo: '2514750010084', dob: '19-05-2005' },
{ rollNo: '2514750010085', dob: '27-03-2008' },
{ rollNo: '2514750010086', dob: '23-07-2006' },
{ rollNo: '2514750010087', dob: '05-12-2008' },
{ rollNo: '2514750010088', dob: '21-07-2005' },
{ rollNo: '2514750010089', dob: '18-12-2005' },
{ rollNo: '2514750010090', dob: '01-01-2007' },
{ rollNo: '2514750010091', dob: '03-07-2006' },
{ rollNo: '2514750010092', dob: '13-11-2006' },
{ rollNo: '2514750010093', dob: '16-01-2006' },
{ rollNo: '2514750010094', dob: '25-10-2006' },
{ rollNo: '2514750010095', dob: '01-01-2004' },
{ rollNo: '2514750010096', dob: '25-01-2005' },
{ rollNo: '2514750010097', dob: '31-01-2005' },
{ rollNo: '2514750010098', dob: '07-06-2005' },
{ rollNo: '2514750010099', dob: '25-04-2008' },
{ rollNo: '2514750010100', dob: '24-06-2005' },
{ rollNo: '2514750010101', dob: '24-11-2005' },
{ rollNo: '2514750010102', dob: '20-05-2006' },
{ rollNo: '2514750010103', dob: '17-07-2006' },
{ rollNo: '2514750010104', dob: '02-10-2006' },
{ rollNo: '2514750010105', dob: '22-04-2006' },
{ rollNo: '2514750010106', dob: '09-12-2006' },
{ rollNo: '2514750010107', dob: '10-03-2006' },
{ rollNo: '2514750010108', dob: '17-07-2004' },
{ rollNo: '2514750010109', dob: '02-03-2005' },
{ rollNo: '2514750010110', dob: '17-12-2005' },
{ rollNo: '2514750010111', dob: '17-07-2006' },
{ rollNo: '2514750010112', dob: '20-07-2006' },
{ rollNo: '2514750010113', dob: '23-06-2006' },
{ rollNo: '2514750010114', dob: '14-09-2005' },
{ rollNo: '2514750010115', dob: '02-10-2005' },
{ rollNo: '2514750010116', dob: '30-09-2005' },
{ rollNo: '2514750010117', dob: '04-04-2006' },
{ rollNo: '2514750010118', dob: '09-08-2004' },
{ rollNo: '2514750010119', dob: '24-02-2004' },
{ rollNo: '2514750010120', dob: '10-04-2007' },
{ rollNo: '2514750010121', dob: '23-04-2005' },
{ rollNo: '2514750010122', dob: '29-08-2005' },
{ rollNo: '2514750010123', dob: '10-07-2005' },
{ rollNo: '2514750010124', dob: '15-07-2007' },
{ rollNo: '2514750010125', dob: '13-09-2005' },
{ rollNo: '2514750010126', dob: '08-02-2006' },
{ rollNo: '2514750010127', dob: '21-10-2004' },
{ rollNo: '2514750010128', dob: '17-02-2008' },
{ rollNo: '2514750010129', dob: '11-12-2003' },
{ rollNo: '2514750010130', dob: '23-04-2006' },
{ rollNo: '2514750010131', dob: '07-07-2005' },
{ rollNo: '2514750010132', dob: '18-01-2007' },
{ rollNo: '2514750010133', dob: '01-01-2007' },
{ rollNo: '2514750010134', dob: '17-11-2007' },
{ rollNo: '2514750010135', dob: '05-07-2005' },
{ rollNo: '2514750010136', dob: '11-11-2007' },
{ rollNo: '2514750010137', dob: '22-07-2005' },
{ rollNo: '2514750010138', dob: '20-07-2005' },
{ rollNo: '2514750010139', dob: '06-08-2005' },
{ rollNo: '2514750010140', dob: '28-09-2004' },
{ rollNo: '2514750010141', dob: '05-07-2005' },
{ rollNo: '2514750010142', dob: '16-08-2005' },
{ rollNo: '2514750010143', dob: '02-09-2005' },
{ rollNo: '2514750010144', dob: '02-11-2004' },
{ rollNo: '2514750010145', dob: '10-01-2005' },
{ rollNo: '2514750010146', dob: '17-09-2007' },
{ rollNo: '2514750010147', dob: '28-05-2007' },
{ rollNo: '2514750010148', dob: '21-01-2006' },
{ rollNo: '2514750010149', dob: '27-05-2006' },
{ rollNo: '2514750010150', dob: '01-09-2006' },
{ rollNo: '2514750010151', dob: '28-05-2007' },

{ rollNo: '2514830010001', dob: '01-05-2005' },
{ rollNo: '2514830010002', dob: '02-01-2006' },
{ rollNo: '2514830010003', dob: '17-08-2006' },
{ rollNo: '2514830010004', dob: '24-07-2005' },
{ rollNo: '2514830010005', dob: '23-01-2004' },
{ rollNo: '2514830010006', dob: '28-07-2006' },
{ rollNo: '2514830010007', dob: '01-01-2006' },
{ rollNo: '2514830010008', dob: '31-03-2008' },
{ rollNo: '2514830010009', dob: '23-01-2006' },
{ rollNo: '2514830010010', dob: '16-03-2005' },
{ rollNo: '2514830010011', dob: '20-03-2005' },
{ rollNo: '2514830010012', dob: '01-01-2007' },
{ rollNo: '2514830010013', dob: '04-04-2006' },
{ rollNo: '2514830010014', dob: '30-11-2006' },
{ rollNo: '2514830010015', dob: '01-01-2006' },
{ rollNo: '2514830010016', dob: '11-07-2005' },
{ rollNo: '2514830010017', dob: '26-01-2006' },
{ rollNo: '2514830010018', dob: '01-01-2006' },
{ rollNo: '2514830010019', dob: '05-07-2005' },
{ rollNo: '2514830010020', dob: '15-12-2004' },
{ rollNo: '2514830010021', dob: '16-01-2005' },
{ rollNo: '2514830010022', dob: '25-05-2005' },
{ rollNo: '2514830010023', dob: '10-01-2004' },
{ rollNo: '2514830010024', dob: '15-01-2005' },
{ rollNo: '2514830010025', dob: '03-11-2006' },
{ rollNo: '2514830010026', dob: '30-08-2005' },
{ rollNo: '2514830010027', dob: '02-02-2006' },
{ rollNo: '2514830010028', dob: '01-02-2005' },
{ rollNo: '2514830010029', dob: '11-07-2005' },
{ rollNo: '2514830010030', dob: '11-12-2006' },
{ rollNo: '2514830010031', dob: '22-02-2006' },
{ rollNo: '2514830010032', dob: '26-04-2008' },
{ rollNo: '2514830010033', dob: '01-01-2006' },
{ rollNo: '2514830010034', dob: '10-02-2007' },
{ rollNo: '2514830010035', dob: '07-06-2005' },
{ rollNo: '2514830010036', dob: '19-10-2004' },
{ rollNo: '2514830010037', dob: '16-07-2007' },
{ rollNo: '2514830010038', dob: '28-03-2005' },
{ rollNo: '2514830010039', dob: '18-09-2006' },
{ rollNo: '2514830010040', dob: '29-09-2005' },
{ rollNo: '2514830010041', dob: '08-09-2004' },
{ rollNo: '2514830010042', dob: '12-10-2005' },
{ rollNo: '2514830010043', dob: '09-04-2004' },
{ rollNo: '2514830010044', dob: '01-12-2007' },
{ rollNo: '2514830010045', dob: '08-08-2007' },
{ rollNo: '2514830010046', dob: '15-12-2007' },

{ rollNo: '2514910010001', dob: '19-06-2006' },
{ rollNo: '2514910010002', dob: '15-08-2007' },
{ rollNo: '2514910010003', dob: '24-08-2005' },
{ rollNo: '2514910010004', dob: '27-12-2007' },
{ rollNo: '2514910010005', dob: '07-06-2005' },
{ rollNo: '2514910010006', dob: '15-07-2008' },
{ rollNo: '2514910010007', dob: '06-08-2006' },
{ rollNo: '2514910010008', dob: '04-07-2007' },
{ rollNo: '2514910010009', dob: '10-07-2008' },
{ rollNo: '2514910010010', dob: '14-03-2004' },
{ rollNo: '2514910010011', dob: '22-01-2007' },
{ rollNo: '2514910010012', dob: '02-04-2007' },
{ rollNo: '2514910010013', dob: '21-04-2007' },
{ rollNo: '2514910010014', dob: '27-05-2006' },
{ rollNo: '2514910010015', dob: '02-02-2005' },
{ rollNo: '2514910010016', dob: '10-08-2006' },
{ rollNo: '2514910010017', dob: '06-07-2007' },
{ rollNo: '2514910010018', dob: '29-06-2007' },
{ rollNo: '2514910010019', dob: '08-11-2008' },
{ rollNo: '2514910010020', dob: '30-09-2005' },
{ rollNo: '2514910010021', dob: '28-12-2006' },
{ rollNo: '2514910010022', dob: '06-03-2006' },
{ rollNo: '2514910010023', dob: '05-12-2004' },
{ rollNo: '2514910010024', dob: '23-03-2005' },
{ rollNo: '2514910010025', dob: '21-01-2006' },
{ rollNo: '2514910010026', dob: '23-12-2007' },
// ⚠️ CONTINUES FOR ALL REMAINING ENTRIES...
];

type ScrapedSubject = {
  course_code?: string | null;
  subject_name: string;
  external_theory?: number | null;
  internal_theory?: number | null;
  internal_practical?: number | null;
  external_practical?: number | null;
  marks: number | null;
  total_credit?: number | null;
  grade_awarded?: string | null;
  grade_point?: number | null;
};

type PortalSubjectRaw = {
  course_code?: string;
  course_title?: string;
  ext_theory?: string;
  int_theory?: string;
  int_pract?: string;
  ext_pract?: string;
  obt_marks?: string;
  tot_credit?: string;
  grade_awarded?: string;
};

type PortalStudentRaw = {
  name?: string;
  student_type?: string;
  father_name?: string;
  roll_no?: string;
  mother_name?: string;
  enrollment_no?: string;
  university_college_name?: string;
};

type PortalExtraction = {
  errorMessage: string | null;
  student: PortalStudentRaw;
  result: PortalSubjectRaw[];
  rawText: string;
};

type ScrapedPayload = {
  status: 'success' | 'not_found' | 'result_pending';
  message?: string;
  name: string;
  branch: string;
  semester: string;
  totalMarks: number | null;
  percentage: number | null;
  cgpa: number | null;
  sgpa: number | null;
  subjects: ScrapedSubject[];
  student: PortalStudentRaw;
  rawText: string;
};

export function getManualCredentialBatch(): ManualCredential[] {
  const deduped = new Map<string, ManualCredential>();

  for (const row of MANUAL_CREDENTIAL_BATCH) {
    const sourceRollNo = Array.isArray(row) ? row[0] : row.rollNo;
    const sourceDob = Array.isArray(row) ? row[1] : row.dob;
    const rollNo = normalizeRollNo(sourceRollNo);
    const dob = normalizeDob(sourceDob);

    if (!rollNo || !dob) {
      continue;
    }

    deduped.set(`${rollNo}::${dob}`, { rollNo, dob });
  }

  return Array.from(deduped.values());
}

export type ScrapeOutcome = {
  success: boolean;
  status: 'success' | 'not_found' | 'result_pending' | 'error';
  retryable: boolean;
  error?: string;
  data?: ScrapedPayload;
};

function getPortalUrls(): string[] {
  const configured = (process.env.RESULT_PORTAL_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const deduped = new Set<string>([RESULT_URL, ...configured, ALT_RESULT_URL]);
  return Array.from(deduped);
}

async function describePage(page: Page): Promise<string> {
  try {
    const url = page.url();
    const title = await page.title().catch(() => '');
    const bodyText = await page.evaluate(() => {
      const text = document.body?.innerText || document.documentElement?.innerText || '';
      return String(text).replace(/\s+/g, ' ').trim().slice(0, 180);
    }).catch(() => '');
    return `url=${url}, title="${title}", body="${bodyText}"`;
  } catch {
    return 'Unable to capture page details.';
  }
}

function cleanNullableNumber(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const cleaned = raw.trim();
  if (!cleaned || cleaned === '---') {
    return null;
  }

  const asNumber = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(asNumber) ? asNumber : null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function gradeToPoint(grade: string | undefined): number | null {
  if (!grade) {
    return null;
  }

  const normalized = grade.trim().toUpperCase();
  const gradeMap: Record<string, number> = {
    'A+': 10,
    A: 9,
    'B+': 8,
    B: 7,
    'C+': 6,
    C: 5,
    D: 4,
    F: 0,
  };
  return normalized in gradeMap ? gradeMap[normalized] : null;
}

function normalizeSubjectRows(rows: PortalSubjectRaw[]): ScrapedSubject[] {
  return rows
    .filter((row) => row && (row.course_code || row.course_title))
    .map((row) => {
      const gradeAwarded = row.grade_awarded?.trim() || null;
      const totalCredit = cleanNullableNumber(row.tot_credit);
      const gradePoint = gradeToPoint(gradeAwarded || undefined);

      return {
        course_code: row.course_code?.trim() || null,
        subject_name: row.course_title?.trim() || row.course_code?.trim() || 'Unknown Subject',
        external_theory: cleanNullableNumber(row.ext_theory),
        internal_theory: cleanNullableNumber(row.int_theory),
        internal_practical: cleanNullableNumber(row.int_pract),
        external_practical: cleanNullableNumber(row.ext_pract),
        marks: cleanNullableNumber(row.obt_marks),
        total_credit: totalCredit,
        grade_awarded: gradeAwarded,
        grade_point: gradePoint,
      };
    });
}

function calculateCgpa(subjects: ScrapedSubject[]): number | null {
  let weightedSum = 0;
  let creditSum = 0;

  for (const subject of subjects) {
    if (typeof subject.grade_point === 'number' && typeof subject.total_credit === 'number') {
      weightedSum += subject.grade_point * subject.total_credit;
      creditSum += subject.total_credit;
    }
  }

  if (creditSum > 0) {
    return Number((weightedSum / creditSum).toFixed(2));
  }

  const points = subjects
    .map((item) => item.grade_point)
    .filter((value): value is number => typeof value === 'number');
  if (points.length === 0) {
    return null;
  }
  return Number((points.reduce((sum, value) => sum + value, 0) / points.length).toFixed(2));
}

function extractSummaryFromText(rawText: string): {
  sgpa: number | null;
  cgpa: number | null;
  percentage: number | null;
  resultLabel: string | null;
} {
  const normalized = rawText.replace(/\s+/g, ' ').trim();

  const sgpaMatch = normalized.match(/semester\s*grade\s*point\s*average\s*\(sgpa\)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i)
    || normalized.match(/\bsgpa\b\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  const cgpaMatch = normalized.match(/cumulative\s*grade\s*point\s*average\s*\(cgpa\)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i)
    || normalized.match(/\bcgpa\b\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  const percentageMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%/);
  const resultMatch = normalized.match(/\bresult\b[^A-Z0-9]{0,20}(INC|PASSED|PROMOTED|FAIL|FAILED)\b/i);

  return {
    sgpa: sgpaMatch ? Number(sgpaMatch[1]) : null,
    cgpa: cgpaMatch ? Number(cgpaMatch[1]) : null,
    percentage: percentageMatch ? Number(percentageMatch[1]) : null,
    resultLabel: resultMatch ? resultMatch[1].toUpperCase() : null,
  };
}

function metricOf(student: { sgpa?: unknown; cgpa?: unknown }, metric: 'sgpa' | 'cgpa'): number | null {
  return metric === 'sgpa'
    ? toNullableNumber(student.sgpa)
    : toNullableNumber(student.cgpa);
}

function rankByMetric(
  students: Array<{ sgpa?: unknown; cgpa?: unknown }>,
  targetMetric: number | null,
  metric: 'sgpa' | 'cgpa',
): number | null {
  if (targetMetric === null) {
    return null;
  }

  const comparable = students
    .map((student) => metricOf(student, metric))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (comparable.length === 0) {
    return null;
  }

  const ahead = comparable.filter((value) => value > targetMetric).length;
  return ahead + 1;
}

type RankingStudent = {
  roll_no: string;
  name?: string | null;
  sgpa?: unknown;
  cgpa?: unknown;
  semester?: string | null;
};

export type RankingEntry = {
  rank: number;
  rollNo: string;
  name: string;
  value: number;
  batchCode: string;
  batchName: string;
};

function createMetricRanking(students: RankingStudent[], metric: 'sgpa' | 'cgpa'): RankingEntry[] {
  const withMetric = students
    .map((student) => {
      const value = metricOf(student, metric);
      if (value === null) {
        return null;
      }
      const batch = getBatchInfoFromRoll(student.roll_no || '');
      return {
        rollNo: student.roll_no,
        name: (student.name || '').trim() || student.roll_no,
        value,
        batchCode: batch.code,
        batchName: batch.name,
      };
    })
    .filter((item): item is { rollNo: string; name: string; value: number; batchCode: string; batchName: string } => item !== null)
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }
      return a.rollNo.localeCompare(b.rollNo);
    });

  const output: RankingEntry[] = [];
  let rank = 0;
  let prevValue: number | null = null;

  for (const row of withMetric) {
    if (prevValue === null || row.value !== prevValue) {
      rank += 1;
      prevValue = row.value;
    }

    output.push({
      rank,
      rollNo: row.rollNo,
      name: row.name,
      value: row.value,
      batchCode: row.batchCode,
      batchName: row.batchName,
    });
  }

  return output;
}

function parsePayload(rollNo: string, extracted: PortalExtraction): ScrapedPayload {
  const subjects = normalizeSubjectRows(extracted.result || []);
  const noRecord = Boolean(
    extracted.errorMessage ||
    /no\s+record\s+found/i.test(extracted.rawText) ||
    subjects.length === 0 ||
    !extracted.student?.name,
  );

  const name = extracted.student?.name?.trim() || `Student ${rollNo}`;
  const branch = extracted.student?.student_type?.trim()
    || extracted.student?.university_college_name?.trim()
    || 'N/A';
  const marksSum = subjects.reduce((sum, item) => sum + (item.marks ?? 0), 0);
  const totalMarks = subjects.length > 0 ? marksSum : null;
  const summary = extractSummaryFromText(extracted.rawText);
  const cgpa = summary.cgpa ?? calculateCgpa(subjects);
  const sgpa = summary.sgpa;
  const percentage = summary.percentage;
  const isPendingResult = summary.resultLabel === 'INC';

  if (noRecord) {
    return {
      status: 'not_found',
      message: extracted.errorMessage || 'No record found on university portal',
      name,
      branch,
      semester: FIXED_SEMESTER,
      totalMarks,
      percentage,
      cgpa,
      sgpa,
      subjects,
      student: extracted.student || {},
      rawText: extracted.rawText,
    };
  }

  if (isPendingResult) {
    return {
      status: 'result_pending',
      message: 'Result is INC (incomplete) and excluded from ranking.',
      name,
      branch,
      semester: FIXED_SEMESTER,
      totalMarks,
      percentage: null,
      cgpa: null,
      sgpa: null,
      subjects,
      student: extracted.student || {},
      rawText: extracted.rawText,
    };
  }

  return {
    status: 'success',
    name,
    branch,
    semester: FIXED_SEMESTER,
    totalMarks,
    percentage,
    cgpa,
    sgpa,
    subjects,
    student: extracted.student || {},
    rawText: extracted.rawText,
  };
}

export async function scrapeStudentResult(rollNo: string, dob: string): Promise<ScrapeOutcome> {
  const cleanedRollNo = normalizeRollNo(rollNo);
  const portalDob = toPortalDob(dob);

  if (!cleanedRollNo || !portalDob) {
    return {
      success: false,
      status: 'error',
      retryable: false,
      error: 'Invalid roll number or DOB format. Use DD-MM-YYYY.',
    };
  }

  console.log(`Scraping result for ${cleanedRollNo}...`);

  try {
    const browser = await puppeteer.launch({
      headless: SCRAPER_HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    let payload: ScrapedPayload;
    let activeSourceUrl = RESULT_URL;

    try {
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
      await page.setDefaultTimeout(Math.max(SELECTOR_TIMEOUT_MS, 15000));
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      );
      await page.setExtraHTTPHeaders({
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      });

      const portalUrls = getPortalUrls();
      let portalReady = false;
      let lastPortalError = '';

      for (const url of portalUrls) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
          await page.waitForSelector('#ddlsem', { timeout: SELECTOR_TIMEOUT_MS });
          portalReady = true;
          activeSourceUrl = url;
          break;
        } catch (error) {
          const pageInfo = await describePage(page);
          lastPortalError = `${(error as Error).message}; ${pageInfo}`;
        }
      }

      if (!portalReady) {
        throw new Error(
          `Portal form did not load (#ddlsem missing). Last check: ${lastPortalError}. ` +
          'This usually means temporary portal throttling or connectivity issue.',
        );
      }

      await page.select('#ddlsem', FIXED_SEMESTER);
      await page.type('#txtRollno', cleanedRollNo, { delay: 20 });
      await page.$eval('#txtDob', (element, dateValue) => {
        const input = element as HTMLInputElement;
        input.value = dateValue as string;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, portalDob);

      await Promise.all([
        page.click('#btnSearch'),
        page.waitForNetworkIdle({ idleTime: 700, timeout: NAV_TIMEOUT_MS }).catch(() => null),
      ]);

      const extracted = await page.evaluate(`
        (() => {
          const clean = (value) => String(value || '').replace(/\\u00a0/g, ' ').trim();
          const tables = document.querySelectorAll('table');
          const msg = document.querySelector('#lblMsg');
          const errorMessage = msg && msg.textContent ? clean(msg.textContent) : null;

          let student = {};
          if (tables.length >= 3) {
            const studentTable = tables[2];
            const cells = studentTable.querySelectorAll('td span');
            if (cells.length >= 7) {
              student = {
                name: clean(cells[0].innerText),
                student_type: clean(cells[1].innerText),
                father_name: clean(cells[2].innerText),
                roll_no: clean(cells[3].innerText),
                mother_name: clean(cells[4].innerText),
                enrollment_no: clean(cells[5].innerText),
                university_college_name: clean(cells[6].innerText),
              };
            }
          }

          const result = [];
          if (tables.length >= 4) {
            const marksTable = tables[3];
            const subjectRows = marksTable.querySelectorAll('tr');
            for (let index = 1; index < subjectRows.length; index += 1) {
              const row = subjectRows[index];
              const cells = row.querySelectorAll('td');
              if (cells.length >= 9) {
                result.push({
                  course_code: clean(cells[0].innerText),
                  course_title: clean(cells[1].innerText),
                  ext_theory: clean(cells[2].innerText),
                  int_theory: clean(cells[3].innerText),
                  int_pract: clean(cells[4].innerText),
                  ext_pract: clean(cells[5].innerText),
                  obt_marks: clean(cells[6].innerText),
                  tot_credit: clean(cells[7].innerText),
                  grade_awarded: clean(cells[8].innerText),
                });
              }
            }
          }

          const rawText = clean(document.body ? document.body.innerText : '');
          return { errorMessage, student, result, rawText };
        })()
      `) as PortalExtraction;

      payload = parsePayload(cleanedRollNo, extracted);
    } finally {
      await browser.close();
    }

    await saveScrapeResult({
      rollNo: cleanedRollNo,
      dob,
      status: payload.status,
      name: payload.name,
      branch: payload.branch,
      semester: payload.semester,
      totalMarks: payload.totalMarks,
      percentage: payload.percentage,
      cgpa: payload.cgpa,
      sourceUrl: activeSourceUrl,
      rawResult: {
        student: payload.student,
        subjects: payload.subjects,
        summary: {
          sgpa: payload.sgpa,
          cgpa: payload.cgpa,
          percentage: payload.percentage,
        },
        rawText: payload.rawText,
      },
      scrapeError: payload.message || null,
      subjects: payload.subjects,
    });

    return {
      success: payload.status === 'success',
      status: payload.status,
      retryable: false,
      data: payload,
    };
  } catch (error) {
    const message = (error as Error).message;
    console.error(`Error scraping ${cleanedRollNo}:`, error);
    await saveScrapeError(cleanedRollNo, dob, FIXED_SEMESTER, RESULT_URL, message);

    return {
      success: false,
      status: 'error',
      retryable: true,
      error: message,
    };
  }
}

export async function getStudentRanks(rollNo: string) {
  const result = await getStudentWithSubjects(rollNo);
  if (!result) {
    return null;
  }

  const { student, subjects } = result;
  const normalizedSubjects = subjects.map((subject) => ({
    ...subject,
    marks: toNullableNumber(subject.marks),
    total_credit: toNullableNumber(subject.total_credit),
    grade_point: toNullableNumber(subject.grade_point),
    external_theory: toNullableNumber(subject.external_theory),
    internal_theory: toNullableNumber(subject.internal_theory),
    internal_practical: toNullableNumber(subject.internal_practical),
    external_practical: toNullableNumber(subject.external_practical),
  }));

  const fallbackTotalMarks = normalizedSubjects.length > 0
    ? normalizedSubjects.reduce((sum, subject) => sum + (subject.marks ?? 0), 0)
    : null;
  const fallbackCgpa = calculateCgpa(normalizedSubjects);

  let rawResult = student.raw_result;
  if (typeof rawResult === 'string') {
    try {
      rawResult = JSON.parse(rawResult);
    } catch {
      rawResult = student.raw_result;
    }
  }

  const rawText = typeof rawResult === 'object' && rawResult !== null
    ? String((rawResult as { rawText?: unknown }).rawText || '')
    : '';
  const summary = extractSummaryFromText(rawText);
  const summaryObject = typeof rawResult === 'object' && rawResult !== null
    ? (rawResult as { summary?: { sgpa?: unknown; cgpa?: unknown; percentage?: unknown } }).summary
    : undefined;
  const sgpaFromRaw = toNullableNumber(summaryObject?.sgpa) ?? summary.sgpa;
  const cgpaFromRaw = toNullableNumber(summaryObject?.cgpa) ?? summary.cgpa;
  const fallbackPercentage = toNullableNumber(summaryObject?.percentage) ?? summary.percentage;
  const hasIncResult = summary.resultLabel === 'INC';

  const normalizedStudent = {
    ...student,
    result_status: hasIncResult ? 'result_pending' : student.result_status,
    sgpa: hasIncResult ? null : sgpaFromRaw,
    total_marks: toNullableNumber(student.total_marks) ?? fallbackTotalMarks,
    cgpa: hasIncResult ? null : (cgpaFromRaw ?? toNullableNumber(student.cgpa) ?? fallbackCgpa),
    percentage: hasIncResult ? null : (toNullableNumber(student.percentage) ?? fallbackPercentage),
  };

  const semesterStudents = await listSuccessfulStudents(normalizedStudent.semester);
  const allStudents = await listSuccessfulStudents();
  const batchInfo = getBatchInfoFromRoll(normalizedStudent.roll_no || rollNo);
  const batchStudents = semesterStudents.filter((student) => getBatchInfoFromRoll(student.roll_no || '').code === batchInfo.code);

  const selfSgpa = metricOf(normalizedStudent, 'sgpa');
  const selfCgpa = metricOf(normalizedStudent, 'cgpa');

  const rankInBatchBySgpa = rankByMetric(batchStudents, selfSgpa, 'sgpa');
  const rankInBatchByCgpa = rankByMetric(batchStudents, selfCgpa, 'cgpa');
  const rankInDepartmentBySgpa = rankByMetric(allStudents, selfSgpa, 'sgpa');
  const rankInDepartmentByCgpa = rankByMetric(allStudents, selfCgpa, 'cgpa');

  // Backward-compatible fields for legacy UI bindings.
  const classRank = rankInBatchBySgpa ?? rankInBatchByCgpa;
  const deptRank = rankInDepartmentBySgpa ?? rankInDepartmentByCgpa;

  return {
    ...normalizedStudent,
    rankInClass: classRank,
    rankInDepartment: deptRank,
    rankInBatchBySgpa,
    rankInBatchByCgpa,
    rankInDepartmentBySgpa,
    rankInDepartmentByCgpa,
    batchCode: batchInfo.code,
    batchName: batchInfo.name,
    batchSize: batchStudents.length,
    departmentSize: allStudents.length,
    rawResult,
    subjects: normalizedSubjects,
  };
}

export async function getRankings(options?: {
  scope?: 'department' | 'batch';
  batchCode?: string;
}): Promise<{
  scope: 'department' | 'batch';
  batchCode: string | null;
  batchName: string | null;
  totalStudents: number;
  sgpa: RankingEntry[];
  cgpa: RankingEntry[];
}> {
  const scope = options?.scope === 'batch' ? 'batch' : 'department';
  const allStudents = await listSuccessfulStudents();

  let scopedStudents = allStudents.map((student) => ({
    ...student,
    sgpa: (student as { sgpa?: unknown }).sgpa,
    cgpa: student.cgpa,
  }));

  let batchCode: string | null = null;
  let batchName: string | null = null;

  if (scope === 'batch') {
    const requested = (options?.batchCode || '').trim();
    if (requested) {
      batchCode = requested;
      batchName = getBatchNameFromCode(batchCode);
      scopedStudents = scopedStudents.filter((student) => getBatchInfoFromRoll(student.roll_no || '').code === batchCode);
    } else {
      scopedStudents = [];
    }
  }

  return {
    scope,
    batchCode,
    batchName,
    totalStudents: scopedStudents.length,
    sgpa: createMetricRanking(scopedStudents, 'sgpa'),
    cgpa: createMetricRanking(scopedStudents, 'cgpa'),
  };
}
