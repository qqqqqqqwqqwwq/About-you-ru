/** Fallback EUR/RUB if CBR XML is unreachable */
export const FALLBACK_EUR_RATE = 98.5;

const CBR_URL = "https://www.cbr.ru/scripts/XML_daily.asp";

/**
 * Fetch EUR/RUB from CBR daily XML.
 * Cached ~24h via Next.js fetch revalidate.
 */
export async function getEurRubRate(): Promise<{
  rate: number;
  source: "cbr" | "fallback";
}> {
  try {
    const res = await fetch(CBR_URL, {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "Rassprodazha/1.0" },
    });

    if (!res.ok) {
      throw new Error(`CBR HTTP ${res.status}`);
    }

    const xml = await res.text();
    // <Valute ID="R01239">...<CharCode>EUR</CharCode>...<Value>98,1234</Value>
    const eurBlock = xml.match(
      /<Valute[^>]*>[\s\S]*?<CharCode>EUR<\/CharCode>[\s\S]*?<Value>([\d,]+)<\/Value>[\s\S]*?<\/Valute>/
    );

    if (!eurBlock?.[1]) {
      throw new Error("EUR not found in CBR XML");
    }

    const rate = parseFloat(eurBlock[1].replace(",", "."));
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Invalid EUR rate");
    }

    return { rate, source: "cbr" };
  } catch (err) {
    console.warn("[cbr] fetch failed, using fallback:", err);
    return { rate: FALLBACK_EUR_RATE, source: "fallback" };
  }
}
