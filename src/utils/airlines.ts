/**
 * ICAO callsign prefix to airline. Callsigns start with the operator's three-letter ICAO code
 * (VLG1234 is Vueling), so a lookup table turns an opaque code into a name people recognise.
 * Deliberately partial: the card simply omits the operator when we do not know it.
 */
const AIRLINES: Record<string, string> = {
  AAL: 'American Airlines',
  ACA: 'Air Canada',
  AEA: 'Air Europa',
  AFL: 'Aeroflot',
  AFR: 'Air France',
  AIC: 'Air India',
  ANA: 'All Nippon Airways',
  ANZ: 'Air New Zealand',
  ASA: 'Alaska Airlines',
  AUA: 'Austrian Airlines',
  AZA: 'ITA Airways',
  BAW: 'British Airways',
  BEL: 'Brussels Airlines',
  BTI: 'airBaltic',
  CCA: 'Air China',
  CES: 'China Eastern',
  CFG: 'Condor',
  CPA: 'Cathay Pacific',
  CSN: 'China Southern',
  CTN: 'Croatia Airlines',
  DAL: 'Delta Air Lines',
  DLH: 'Lufthansa',
  EIN: 'Aer Lingus',
  ELY: 'El Al',
  ETD: 'Etihad Airways',
  ETH: 'Ethiopian Airlines',
  EWG: 'Eurowings',
  EZY: 'easyJet',
  FDX: 'FedEx',
  FIN: 'Finnair',
  GLO: 'Gol',
  IBE: 'Iberia',
  IBS: 'Iberia Express',
  ICE: 'Icelandair',
  JAL: 'Japan Airlines',
  JBU: 'JetBlue',
  KAL: 'Korean Air',
  KLM: 'KLM',
  LOT: 'LOT Polish Airlines',
  MSR: 'EgyptAir',
  NAX: 'Norwegian',
  NKS: 'Spirit Airlines',
  PGT: 'Pegasus Airlines',
  QFA: 'Qantas',
  QTR: 'Qatar Airways',
  RAM: 'Royal Air Maroc',
  ROU: 'Air Canada Rouge',
  RYR: 'Ryanair',
  RJA: 'Royal Jordanian',
  SAS: 'SAS',
  SIA: 'Singapore Airlines',
  SVA: 'Saudia',
  SWA: 'Southwest Airlines',
  SWR: 'Swiss',
  TAP: 'TAP Air Portugal',
  TAR: 'Tunisair',
  THA: 'Thai Airways',
  THY: 'Turkish Airlines',
  TRA: 'Transavia',
  TVF: 'Transavia France',
  TVS: 'Smartwings',
  UAE: 'Emirates',
  UAL: 'United Airlines',
  UPS: 'UPS Airlines',
  VLG: 'Vueling',
  VIR: 'Virgin Atlantic',
  VOE: 'Volotea',
  WJA: 'WestJet',
  WZZ: 'Wizz Air',
}

/**
 * An ICAO callsign is three letters of operator code followed by a flight number: VLG1234.
 * Anything else -- a tail number like N512DK, a military string -- is not an operator code, and
 * slicing three characters off it would produce a confident, wrong airline. Better to say
 * nothing: the card omits the operator entirely when this returns null.
 */
const ICAO_CALLSIGN = /^[A-Z]{3}[0-9][A-Z0-9]*$/

export function airlineFromCallsign(callsign: string | null): string | null {
  if (!callsign || !ICAO_CALLSIGN.test(callsign)) return null
  return AIRLINES[callsign.slice(0, 3)] ?? null
}
