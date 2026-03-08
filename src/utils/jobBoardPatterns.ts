/**
 * Common job board and ATS hostnames to ignore when deriving a company's domain from a job URL.
 * Shared across Dashboard, ApplicationDetail, and ApplicationCard.
 */
export const JOB_BOARD_PATTERNS = [
  // ATS platforms
  /lever\.co$/i,
  /greenhouse\.io$/i,
  /workday\.com$/i,
  /myworkdayjobs\.com$/i,
  /wd5\.myworkdayjobs\.com$/i,
  /wd1\.myworkdayjobs\.com$/i,
  /ashbyhq\.com$/i,
  /jobs\.ashbyhq\.com$/i,
  /icims\.com$/i,
  /smartrecruiters\.com$/i,
  /jobvite\.com$/i,
  /applytojob\.com$/i,
  /breezy\.hr$/i,
  /recruitee\.com$/i,
  /bamboohr\.com$/i,
  /jazz\.co$/i,
  /jazzhq\.com$/i,
  /workable\.com$/i,
  /taleo\.net$/i,
  /oraclecloud\.com$/i,
  /successfactors\.com$/i,
  /ultipro\.com$/i,
  /paylocity\.com$/i,
  /paycom\.com$/i,
  /adp\.com$/i,
  /phenom\.com$/i,
  /eightfold\.ai$/i,
  /avature\.net$/i,
  /cornerstoneondemand\.com$/i,
  /pinpointhq\.com$/i,
  /teamtailor\.com$/i,
  /personio\.de$/i,
  /personio\.com$/i,
  /gem\.com$/i,
  /wellfound\.com$/i,
  /angel\.co$/i,
  /ycombinator\.com$/i,
  /workatastartup\.com$/i,
  /dover\.com$/i,
  /rippling\.com$/i,
  /gusto\.com$/i,
  /deel\.com$/i,
  /remote\.com$/i,
  /oysterhr\.com$/i,
  // Job boards
  /linkedin\.com$/i,
  /indeed\.com$/i,
  /ziprecruiter\.com$/i,
  /glassdoor\.com$/i,
  /monster\.com$/i,
  /careerbuilder\.com$/i,
  /dice\.com$/i,
  /simplyhired\.com$/i,
  /snagajob\.com$/i,
  /flexjobs\.com$/i,
  /builtin\.com$/i,
  /themuse\.com$/i,
  /hired\.com$/i,
  /triplebyte\.com$/i,
  /otta\.com$/i,
  /cord\.co$/i,
  /getro\.com$/i,
];

export function isJobBoardHost(hostname: string): boolean {
  return JOB_BOARD_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function deriveCompanyDomain(url: string, companyName: string): string {
  try {
    const u = new URL(url);
    const hostname = u.hostname.replace(/^www\./, "");
    if (isJobBoardHost(hostname)) {
      return companyName.toLowerCase().replace(/\s+/g, "") + ".com";
    }
    return hostname;
  } catch {
    return companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  }
}
