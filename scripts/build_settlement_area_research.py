#!/usr/bin/env python3
"""Build the research-only settlement-area dataset.

This deliberately does not feed the application.  It combines measurements found
in The Dawn of Everything with reputable archaeological and official sources, and
adds an explicit unknown row wherever no defensible settlement footprint was found.
"""

from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SETTLEMENTS = ROOT / "data" / "derived" / "settlements.csv"
OUTPUT = ROOT / "data" / "research" / "settlement_areas.csv"

BOOK = "Graeber, David, and David Wengrow. The Dawn of Everything (2021)."
BOOK_PATH = "book/The_Dawn_of_Everything.txt"
FIFA_URL = "https://publications.fifa.com/de/football-stadiums-guidelines/technical-guideline/stadium-guidelines/pitch-dimensions-and-surrounding-areas/"
ST_JAMES_URL = "https://www.royalparks.org.uk/visit/parks/st-jamess-park/faqs"
VATICAN_URL = "https://www.vaticanstate.va/en/state-and-government/general-informations/geography.html"
HYDE_URL = "https://www.royalparks.org.uk/visit/parks/hyde-park/faqs"
CENTRAL_PARK_URL = "https://www.nps.gov/places/central-park.htm"
RICHMOND_URL = "https://www.royalparks.org.uk/visit/parks/richmond-park/faqs"

observations: list[dict[str, object]] = []


def add(
    canonical_name: str,
    period_label: str,
    area_min_ha: float | None,
    area_max_ha: float | None,
    *,
    qualifier: str = "approximate",
    area_basis: str = "settlement footprint",
    start: int | None = None,
    end: int | None = None,
    preferred: bool = True,
    source_tier: str = "peer-reviewed",
    source_type: str = "scholarly publication",
    citation: str,
    url: str = "",
    locator: str = "",
    confidence: str = "medium",
    notes: str = "",
) -> None:
    observations.append(
        {
            "canonical_name": canonical_name,
            "period_start_year": start,
            "period_end_year": end,
            "period_label": period_label,
            "area_hectares_min": area_min_ha,
            "area_hectares_max": area_max_ha,
            "qualifier": qualifier,
            "area_basis": area_basis,
            "is_preferred": preferred,
            "source_tier": source_tier,
            "source_type": source_type,
            "source_citation": citation,
            "source_url": url,
            "source_locator": locator,
            "confidence": confidence,
            "notes": notes,
        }
    )


def book_add(*args: object, line: int, **kwargs: object) -> None:
    add(
        *args,
        citation=BOOK,
        locator=f"{BOOK_PATH}:L{line}",
        source_tier="project book",
        source_type="book text",
        **kwargs,
    )


# Late Palaeolithic, Neolithic, and Chalcolithic sites.
add("Göbekli Tepe", "c. 9500–8000 BCE", 9, 9, qualifier="approximate", area_basis="archaeological tell/site footprint", start=-9500, end=-8000, citation="Dietrich et al., Cambridge Archaeological Journal, 'Göbekli Tepe' (2025).", url="https://doi.org/10.1017/S0959774325000113", confidence="medium", notes="Site/tell extent; not all nine hectares were necessarily occupied at once.")
book_add("Poverty Point", "monumental precinct c. 1600 BCE", 200, None, qualifier="over", area_basis="monumental precinct", start=-1600, end=-1600, line=1442, confidence="high")
add("Sannai Maruyama", "Jōmon settlement, c. 3900–2300 BCE", 35, 40, qualifier="published range", area_basis="archaeological settlement/site extent", start=-3900, end=-2300, citation="Habu, Antiquity 74 (2000); Japan Search, Sannai-Maruyama Site.", url="https://www.cambridge.org/core/services/aop-cambridge-core/content/view/AAEB4223BC3D3A300F2D1B8350977479/S0003598X00059159a.pdf/editorial.pdf; https://jpsearch.go.jp/en/item/cb1-6a82762f_ac8e_41dd_a325_8dd746bfb39d", confidence="medium", notes="The academic source reports more than 35 ha; the official cultural record reports remains spread over about 40 ha.")
book_add("Çatalhöyük", "occupation c. 7400–5900 BCE", 13, 13, qualifier="reported", area_basis="settlement footprint", start=-7400, end=-5900, line=2060, confidence="high")
book_add("Jericho", "ninth millennium BCE", None, 10, qualifier="approaching", area_basis="settlement footprint", start=-9000, end=-8000, line=2160, confidence="medium")
add("Karahan Tepe", "PPNA–PPNB, c. 9400–8200 BCE", 14, 14, qualifier="approximate", area_basis="archaeological site footprint", start=-9400, end=-8200, citation="Republic of Türkiye Directorate of Communications, Karahantepe site report (2025).", url="https://www.iletisim.gov.tr/turkce/yerel_basin/detay/karahantepe-yeni-cehresine-kavusuyor-sanliurfa", source_tier="official government", source_type="government site report", confidence="medium")
add("Körtik Tepe", "Epipalaeolithic–PPNA, c. 10400–9250 BCE", 1.5, 1.5, qualifier="approximate", area_basis="mound footprint", start=-10400, end=-9250, citation="Özkaya, 'Excavation at Körtik Tepe,' Neo-Lithics 2/09 (2009).", url="https://www.vorderasien.uni-freiburg.de/dokumente/benz-pdf/Oezkaya2009Neolithics", confidence="medium", notes="Mound dimensions are about 100 × 150 m; the area is a footprint approximation.")
add("Çayönü Tepesi", "Neolithic occupation c. 10000–6000 BCE", 5.5, 5.5, qualifier="approximate", area_basis="settlement footprint", start=-10000, end=-6000, citation="Diyarbakır Governorship, Çayönü Tepesi (2024).", url="https://diyarbakir.gov.tr/cayonu", source_tier="official government", source_type="government cultural heritage page", confidence="medium", notes="Official page reports roughly 55,000 m².")
add("Tell Brak", "Late Chalcolithic 3–4, c. 3900–3350 BCE", 130, 130, qualifier="approximate", area_basis="contemporaneous settled area", start=-3900, end=-3350, citation="Emberling et al., Archaeological and Anthropological Sciences (2025).", url="https://link.springer.com/article/10.1007/s12520-025-02290-8", confidence="medium", notes="The broader scatter approaches 300 ha, but 130 ha is the phase-specific settled-area estimate.")
book_add("Tell Sabi Abyad", "village c. 6200 BCE", 1, 1, qualifier="reported", area_basis="settlement footprint", start=-6200, end=-6200, line=3727, confidence="high")
add("Herxheim", "LBK settlement c. 5300–4950 BCE", 5, 6, qualifier="published range", area_basis="settlement/enclosure footprint", start=-5300, end=-4950, citation="Zeeb-Lanz et al., 'The LBK enclosure at Herxheim.'", url="https://citeseerx.ist.psu.edu/document?doi=6be7aa41eaae0c0b2f5f512fe227bf3545ad2cd9&repid=rep1&type=pdf", confidence="medium")
book_add("Liangchengzhen", "by no later than c. 2500 BCE", 300, None, qualifier="at least", area_basis="settlement footprint", start=-2500, end=-2500, line=2693, confidence="medium")
book_add("Yaowangcheng", "by no later than c. 2500 BCE", 300, None, qualifier="at least", area_basis="settlement footprint", start=-2500, end=-2500, line=2693, confidence="medium")
add("Caral", "Sacred City of Caral, c. 3000–1900 BCE", 68, 68, qualifier="approximate", area_basis="urban settlement footprint", start=-3000, end=-1900, citation="Peru Ministry of Culture, Zona Arqueológica Caral, Sacred City of Caral.", url="https://www.gob.pe/10734-ciudad-sagrada-de-caral", source_tier="official government", source_type="national archaeology authority", confidence="high", notes="Includes the monumental core, residential compounds, and two peripheral areas; excludes the 626-ha UNESCO property boundary.")
book_add("Taljanky", "Trypillia megasite", 300, 300, qualifier="reported", area_basis="settlement footprint", start=-3700, end=-3500, line=2720, preferred=False, confidence="medium", notes="Book estimate retained as a non-preferred observation; newer published estimate is 320 ha.")
add("Taljanky", "Trypillia megasite c. 3700–3500 BCE", 320, 320, qualifier="approximate", area_basis="mapped settlement footprint", start=-3700, end=-3500, citation="Kirleis et al., Vegetation History and Archaeobotany 29 (2020).", url="https://link.springer.com/article/10.1007/s00334-019-00730-9", confidence="high")
add("Maidenetske", "Trypillia megasite c. 3700–3500 BCE", 200, 200, qualifier="approximate", area_basis="mapped settlement footprint", start=-3700, end=-3500, citation="Müller et al., Antiquity 96 (2022).", url="https://doi.org/10.15184/aqy.2022.32", confidence="high")
add("Nebelivka", "Trypillia megasite c. 3900–3650 BCE", 238, 238, qualifier="approximate", area_basis="mapped settlement footprint", start=-3900, end=-3650, citation="Chapman et al., Cambridge Archaeological Journal (2014).", url="https://www.cambridge.org/core/journals/cambridge-archaeological-journal/article/trypillia-megasites-in-context-independent-urban-development-in-chalcolithic-eastern-europe/C33D85AF4EE4BA2D61AAB77D3E399E4D", confidence="high")

# Uruk is intentionally multi-row: expansion and later contraction are central to
# the research question. The book's c.3300 estimate is retained beside phase-based
# scholarship rather than silently reconciled.
add("Uruk", "Middle Uruk, c. 3800–3350 BCE", 100, 100, qualifier="approximate", area_basis="urban footprint", start=-3800, end=-3350, citation="Cambridge Archaeological Journal, 'Beyond Linear Time' (2024).", url="https://www.cambridge.org/core/journals/cambridge-archaeological-journal/article/beyond-linear-time-temporal-plurality-of-annales-and-the-interpretation-of-the-late-chalcolithic-period-in-north-mesopotamia/D41D26EB52DBB466881811D40DA53BD1", confidence="high")
book_add("Uruk", "around 3300 BCE", 200, 200, qualifier="around", area_basis="urban footprint", start=-3300, end=-3300, line=2838, preferred=False, confidence="medium", notes="Project-book estimate; phase-based scholarship places Late Uruk nearer 250 ha.")
add("Uruk", "Late Uruk, c. 3350–3100 BCE", 250, 250, qualifier="approximate", area_basis="urban footprint", start=-3350, end=-3100, citation="Cambridge Archaeological Journal, 'Beyond Linear Time' (2024).", url="https://www.cambridge.org/core/journals/cambridge-archaeological-journal/article/beyond-linear-time-temporal-plurality-of-annales-and-the-interpretation-of-the-late-chalcolithic-period-in-north-mesopotamia/D41D26EB52DBB466881811D40DA53BD1", confidence="high")
add("Uruk", "Early Dynastic expansion, by c. 2800 BCE", 600, 600, qualifier="approximate", area_basis="walled/urban extent", start=-2800, end=-2800, citation="Altaweel et al., World Archaeology 51 (2019).", url="https://www.tandfonline.com/doi/full/10.1080/00438243.2019.1592018", confidence="medium", notes="AJA literature gives about 400 ha for dense early-third-millennium occupation; 600 ha is the larger walled/urban extent.")
add("Uruk", "Seleucid city, c. 300–125 BCE", 200, 200, qualifier="approximate", area_basis="inhabited area within walls", start=-300, end=-125, citation="Petrie, 'Seleucid Uruk: an analysis of ceramic distribution,' Iraq 64 (2002).", url="https://www.cambridge.org/core/journals/iraq/article/abs/seleucid-uruk-an-analysis-of-ceramic-distribution/8F0B7E5079F15D1441273C4A7538C0CF", confidence="medium", notes="About two-thirds of the roughly 300-ha walled city was inhabited.")

# Bronze Age and Iron Age Southwest Asia.
book_add("Harappa", "early urban settlement", 200, 200, qualifier="roughly", area_basis="urban footprint", start=-2600, end=-2500, line=1444, preferred=False, confidence="low", notes="Broad book comparison; phase-series observations below are preferred.")
for phase, start, end, area in [
    ("Harappa 1", -3800, -3200, 1),
    ("Harappa 2", -3200, -2800, 1.5),
    ("Harappa 3A", -2800, -2600, 32),
    ("Harappa 3B", -2600, -2200, 100),
    ("Harappa 3C", -2200, -1900, 150),
    ("Harappa 4", -1900, -1800, 100),
    ("Harappa 5", -1800, -1500, 8),
]:
    add("Harappa", f"{phase}, c. {abs(start)}–{abs(end)} BCE", area, area, qualifier="approximate", area_basis="settlement footprint", start=start, end=end, citation="Chase et al., 'Bricks and urbanism in the Indus Valley rise and decline' (2013), phase-area table.", url="https://arxiv.org/abs/1303.1426", source_tier="scholarly preprint", source_type="research paper", confidence="medium")
add("Mohenjo-daro", "Mature Harappan, c. 2600–1900 BCE", 250, None, qualifier="over", area_basis="urban extent", start=-2600, end=-1900, citation="Harappa Archaeological Research Project, 'An Ancient Indus Valley Metropolis.'", url="https://www.harappa.com/content/ancient-indus-valley-metropolis-3", source_tier="institutional archaeology project", source_type="project publication", confidence="medium", notes="Published estimates vary materially; some syntheses give 100–200 ha because the edge is uncertain.")
add("Dholavira", "Harappan walled city, c. 3000–1500 BCE", 47.6, 47.6, qualifier="calculated approximate", area_basis="outer fortification footprint", start=-3000, end=-1500, citation="Archaeological Survey of India, Site Management Plan: Dholavira, A Harappan City (UNESCO nomination dossier, 2020).", url="https://whc.unesco.org/document/184543", source_tier="official archaeology authority", source_type="site management plan", confidence="high", notes="Calculated and rounded from the published outer-fortification dimensions of 771 × 617 m; this is the walled-city envelope, not a claim of continuously built residential area, and it excludes the cemetery.")
add("Lothal", "Harappan city, c. 2400–1900 BCE", 10, 10, qualifier="approximate", area_basis="urban settlement footprint", start=-2400, end=-1900, citation="University of Bologna/ASI Lothal project overview.", url="https://www.archaeoastronomy.it/Lothal.htm", source_tier="institutional archaeology project", source_type="project overview", confidence="medium")
add("Shortugai", "Indus trading settlement, early second millennium BCE", 2.5, 2.5, qualifier="reported", area_basis="site footprint", start=-2000, end=-1800, citation="Délégation Archéologique Française en Afghanistan, Shortugai.", url="https://www.dafa-afgh.org/recherche/les-operations-de-terrain-entre-1922-et-1982/shortugai/", source_tier="official archaeology mission", source_type="institutional site report", confidence="high")
add("Nineveh", "at start of Sennacherib's reign, c. 705 BCE", 200, 200, qualifier="approximate", area_basis="urban footprint", start=-705, end=-705, citation="Water History, study of Nineveh's hydraulic landscape (2024).", url="https://link.springer.com/article/10.1007/s12685-024-00348-3", confidence="high")
add("Nineveh", "by end of Sennacherib's reign, c. 681 BCE", 750, 750, qualifier="approximate", area_basis="walled urban footprint", start=-681, end=-681, citation="Water History, study of Nineveh's hydraulic landscape (2024).", url="https://link.springer.com/article/10.1007/s12685-024-00348-3", confidence="high")
add("Nimrud", "Neo-Assyrian capital, ninth century BCE", 360, 360, qualifier="approximate", area_basis="city footprint", start=-879, end=-800, citation="French Ministry of Culture, Nimrud/ancient Kalhu.", url="https://archeologie.culture.gouv.fr/khorsabad/en/nimrud-ancient-kalhu", source_tier="official government", source_type="national archaeology portal", confidence="high")
add("Babylon", "first millennium BCE", 1000, 1000, qualifier="approximate", area_basis="ruins/ancient city extent", start=-1000, end=-539, citation="French Ministry of Culture, Babylon.", url="https://archeologie.culture.gouv.fr/en/babylon", source_tier="official government", source_type="national archaeology portal", confidence="medium")
add("Lagash", "Early Dynastic city", 300, 300, qualifier="approximate", area_basis="mapped architectural extent", start=-2900, end=-2350, citation="Hammer et al., Journal of Archaeological Science 141 (2022).", url="https://www.sciencedirect.com/science/article/pii/S0278416522000666", confidence="medium")
for period, start, end, area, note in [
    ("fourth to mid-third millennia BCE", -4000, -2500, 80, "Early city."),
    ("Ur III expansion", -2112, -2004, 135, "Expanded walled city."),
    ("Old Babylonian contraction", -2004, -1595, 70, "Approximate city after the post-Ur-III contraction."),
    ("Kassite recovery", -1595, -1155, 135, "City again occupied the larger walled extent."),
]:
    add("Nippur", period, area, area, qualifier="approximate", area_basis="urban/walled footprint", start=start, end=end, citation="Institute for the Study of Ancient Cultures, Nippur reports and monographs.", url="https://isac.uchicago.edu/sites/oi.uchicago.edu/files/uploads/shared/docs/Publications/Annual-Reports/2023-2024/AR2023-24_Nippur.pdf; https://isac.uchicago.edu/sites/default/files/uploads/shared/docs/Publications/ISACMP/isacmp1.pdf", source_tier="university archaeological institute", source_type="excavation report/monograph", confidence="medium", notes=note)
for phase, area in [("Uruk", 10.1), ("Early Dynastic I", 139.5), ("Early Dynastic III", 230.9), ("Akkadian", 68.3), ("Ur III / Isin-Larsa", 90.7), ("Old Babylonian", 80.3)]:
    add("Kish", phase, area, area, qualifier="reported", area_basis="phase-specific occupied area", citation="Ur, 'Sherds to Landscapes: The Archaeology of Kish' (ISAC/Harvard, 2021).", url="https://scholar.harvard.edu/files/jasonur/files/ur_2021_saoc_71_sherds_to_landscapes_kish.pdf", source_tier="university archaeological institute", source_type="archaeological monograph", confidence="high")
add("Mashkan-shapir", "Ur III occupation", 5, 5, qualifier="approximate", area_basis="occupied area", start=-2112, end=-2004, citation="Stone and Zimansky, The Anatomy of a Mesopotamian City (2004).", url="https://dokumen.pub/the-anatomy-of-a-mesopotamian-city-survey-and-soundings-at-mashkan-shapir-9781575065465.html", source_tier="scholarly monograph", source_type="archaeological monograph", confidence="medium")
add("Mashkan-shapir", "Old Babylonian city", 56, 56, qualifier="approximate", area_basis="occupied area", start=-2000, end=-1700, citation="Stone and Zimansky, The Anatomy of a Mesopotamian City (2004).", url="https://dokumen.pub/the-anatomy-of-a-mesopotamian-city-survey-and-soundings-at-mashkan-shapir-9781575065465.html", source_tier="scholarly monograph", source_type="archaeological monograph", confidence="medium", notes="The city wall enclosed about 72 ha, some sparsely occupied.")
add("Kanesh", "Old Assyrian trading city, c. twentieth–eighteenth centuries BCE", 200, 200, qualifier="around", area_basis="occupation extent", start=-2000, end=-1700, citation="Kulakoğlu and Michel (eds.), Current Research at Kültepe-Kanesh (2023).", url="https://lockwoodpressonline.com/index.php/ebooks/catalog/download/31/55/4072?inline=1", source_tier="scholarly edited volume", source_type="archaeological publication", confidence="medium")

# Bronze Age China.
add("Anyang (Yinxu)", "late Shang capital, c. 1250–1050 BCE", 3000, None, qualifier="over", area_basis="urban extent", start=-1250, end=-1050, citation="Liu and Chen, The Archaeology of China (UCLA Cotsen Institute).", url="https://escholarship.org/content/qt9df4w6kn/qt9df4w6kn.pdf", source_tier="university press", source_type="scholarly synthesis", confidence="medium")
add("Shimao", "inner-town phase", 210, 210, qualifier="approximate", area_basis="inner-town enclosure", start=-2300, end=-1800, citation="Journal of Archaeological Science: Reports, Shimao urban formation study (2023).", url="https://www.sciencedirect.com/science/article/pii/S2352409X23000196", confidence="medium")
add("Shimao", "completed inner and outer city, c. 2300–1800 BCE", 425, 425, qualifier="approximate", area_basis="total urban/enclosed extent", start=-2300, end=-1800, citation="Journal of Archaeological Science: Reports, Shimao urban formation study (2023).", url="https://www.sciencedirect.com/science/article/pii/S2352409X23000196", confidence="high")
book_add("Taosi", "initial fortified settlement", 60, 60, qualifier="reported", area_basis="fortified footprint", start=-2300, end=-2200, line=2984, confidence="medium")
book_add("Taosi", "later Taosi phase", 280, 280, qualifier="around", area_basis="urban footprint", start=-2200, end=-2000, line=2994, confidence="medium", notes="The book describes later growth from roughly 280 to 300 ha.")
book_add("Taosi", "late expansion", 300, 300, qualifier="around", area_basis="urban footprint", start=-2000, end=-1800, line=2994, confidence="medium")
book_add("Wangchenggang", "Longshan-period walled settlement", 30, 30, qualifier="around", area_basis="total walled area", start=-2200, end=-2000, line=5550, confidence="medium")
add("Erlitou", "Erlitou phase I", 100, 100, qualifier="approximate", area_basis="settlement footprint", start=-1750, end=-1700, citation="Liu and Chen, The Archaeology of China (UCLA Cotsen Institute).", url="https://escholarship.org/content/qt9df4w6kn/qt9df4w6kn_noSplash_a8c2cbb73ce509220814d06ba4327e0f.pdf", source_tier="university press", source_type="scholarly synthesis", confidence="medium")
add("Erlitou", "Erlitou phase II", 300, 300, qualifier="approximate", area_basis="settlement footprint", start=-1700, end=-1600, citation="Liu and Chen, The Archaeology of China (UCLA Cotsen Institute).", url="https://escholarship.org/content/qt9df4w6kn/qt9df4w6kn_noSplash_a8c2cbb73ce509220814d06ba4327e0f.pdf", source_tier="university press", source_type="scholarly synthesis", confidence="medium")
add("Zhengzhou Shang City", "Shang-period inner city", 300, 300, qualifier="approximate", area_basis="inner-city enclosure", start=-1600, end=-1400, citation="Henan Provincial Institute of Cultural Heritage and Archaeology, Zhengzhou Shang City.", url="https://en.hnswwkgyjy.cn/archaeologicalDiscoveries/details.html?id=7262662564021014528", source_tier="official archaeology institute", source_type="institutional site report", confidence="medium", notes="The larger outer settlement is not quantified here.")

# Mesoamerica and the Andes.
book_add("Tenochtitlan", "at the Spanish conquest, c. 1521 CE", 1295, None, qualifier="over", area_basis="city footprint", start=1521, end=1521, line=3170, confidence="high", notes="Converted and sensibly rounded from more than five square miles.")
book_add("Teotihuacan", "survey-plan composite, c. 100 BCE–600 CE", 2072, 2072, qualifier="chronologically composite", area_basis="mapped built environment", start=-100, end=600, line=3090, confidence="medium", notes="Converted and sensibly rounded from eight square miles. The plan collapses several centuries and is not a single contemporaneous footprint.")
add("Calakmul", "Preclassic–Classic city, c. 600 BCE–900 CE", 3000, None, qualifier="over", area_basis="urban settlement extent", start=-600, end=900, citation="Latin American Antiquity, Calakmul mobility and diet study (2024).", url="https://www.cambridge.org/core/journals/latin-american-antiquity/article/calakmul-as-a-central-place-isotopic-insights-on-urban-maya-mobility-and-diet-during-the-first-millennium-ad/9EC00281BF79764B5F575FF1AE927CA6", confidence="medium")
add("Palenque", "Terminal Preclassic / Protoclassic villages", 24, 24, qualifier="approximate", area_basis="combined two-village footprint", start=-100, end=250, citation="Instituto Nacional de Antropología e Historia, Palenque history.", url="https://lugares.inah.gob.mx/es/node/5618", source_tier="official archaeology institute", source_type="national heritage site", confidence="medium", notes="Combines a 16-ha western village and an 8-ha central village.")
add("Palenque", "Classic-period mapped city", 220, 220, qualifier="at least", area_basis="fully mapped urban area", start=250, end=900, citation="Barnhart, Palenque Mapping Project report (FAMSI, 2005).", url="https://www.mayaexploration.org/pdf/PalenqueSocialOrganization_Nov2005.pdf", source_tier="institutional archaeology project", source_type="survey report", confidence="medium")
add("Monte Albán", "Xoo phase", 650, 650, qualifier="approximate", area_basis="urban footprint", start=500, end=800, citation="Blanton et al., Ancient Oaxaca (Library of Congress-hosted scholarly volume).", url="https://tile.loc.gov/storage-services/master/gdc/gdcebookspublic/20/20/71/50/73/2020715073/2020715073.pdf", source_tier="scholarly monograph", source_type="archaeological synthesis", confidence="medium")
add("Tula (Tollan)", "Tollan phase", 1600, 1600, qualifier="approximate", area_basis="surveyed urban extent", start=900, end=1150, citation="Healan et al., Ancient Mesoamerica, revised chronology and settlement history of Tula.", url="https://www.cambridge.org/core/journals/ancient-mesoamerica/article/revised-chronology-and-settlement-history-of-tula-and-the-tula-region/B82102468C38BAF62DB2E2FE72D72D9D", confidence="medium", notes="Revised estimate is about 16 km² and may still omit several square kilometres.")
book_add("Cahokia", "rapid growth around 1050 CE", 1554, None, qualifier="over", area_basis="city footprint", start=1050, end=1050, line=4043, confidence="high", notes="Converted and sensibly rounded from more than six square miles.")
add("Tlaxcala", "Late Postclassic Tlaxcallan", 700, None, qualifier="at least", area_basis="settlement footprint", start=1250, end=1519, citation="Fargher, Tlaxcallan archaeological survey report (FAMSI, 2007).", url="https://www.ancientamericas.org/sites/default/files/06082Fargher01.compressed.pdf", source_tier="institutional archaeology project", source_type="survey report", confidence="medium")
add("Chichén Itzá", "city at peak, c. 800–1200 CE", 2500, 2500, qualifier="approximate", area_basis="dense urban development", start=800, end=1200, citation="Government of Yucatán, Chichén Itzá.", url="https://www.yucatan.gob.mx/?p=chichen_itza", source_tier="official government", source_type="government heritage page", confidence="medium")
add("San Lorenzo Tenochtitlán", "Olmec centre, c. 1400–900 BCE", 600, 600, qualifier="approximate", area_basis="central plateau occupation", start=-1400, end=-900, citation="Yale eHRAF Archaeology, Olmec summary (citing archaeological literature).", url="https://ehrafarchaeology.yale.edu/traditions/nu95/summary", source_tier="university research database", source_type="archaeological synthesis", confidence="medium")
add("La Venta", "Olmec city, c. 1200–400 BCE", 200, None, qualifier="at least", area_basis="civic, administrative, and residential city extent", start=-1200, end=-400, citation="Instituto Nacional de Antropología e Historia, La Venta.", url="https://lugares.inah.gob.mx/es/node/5524", source_tier="official archaeology institute", source_type="national heritage site", confidence="high")
for label, start, end, area in [
    ("Urubarriu phase", -850, -550, 6),
    ("Chakinani phase", -550, -450, 15),
    ("Janabarriu phase", -450, -250, 42),
]:
    add("Chavín de Huántar", label, area, area, qualifier="approximate", area_basis="residential/urban settlement footprint", start=start, end=end, citation="Yale eHRAF Archaeology, Chavín summary (citing Burger's phase sequence).", url="https://ehrafarchaeology.yale.edu/traditions/SE49/summary", source_tier="university research database", source_type="archaeological synthesis", confidence="medium")
book_add("Tiwanaku", "Middle Horizon, c. 500–1000 CE", 420, 420, qualifier="reported", area_basis="urban footprint", start=500, end=1000, line=3462, confidence="high")
add("Wari (Huari)", "Middle Horizon capital, c. 600–1000 CE", 600, 600, qualifier="approximate", area_basis="urban extent", start=600, end=1000, citation="Estudios Latinoamericanos 40, urbanism at Huari (2020).", url="https://wuw.pl/data/include/cms/Estudios_Latinoamericanos_2020_40.pdf", confidence="medium", notes="Dense architectural core estimates range roughly 250–600 ha; dispersed total-site estimates reach 1,200–1,500 ha.")

# Aegean Bronze Age.
add("Knossos", "Neopalatial peak, c. 1700–1450 BCE", 100, 100, qualifier="approximate", area_basis="urban settlement footprint", start=-1700, end=-1450, citation="Whitelaw, 'Minoan Urbanism' (UCL, 2017).", url="https://discovery.ucl.ac.uk/10027562/1/WhitelawMinoanUrbanismFinal2017.pdf", source_tier="university research publication", source_type="scholarly chapter", confidence="medium")
add("Phaistos", "Protopalatial settlement, c. 1900–1700 BCE", 40, 40, qualifier="estimated", area_basis="settlement footprint", start=-1900, end=-1700, citation="Whitelaw, 'Recognising Polities in Prepalatial Crete' (UCL, 2018).", url="https://discovery.ucl.ac.uk/10049667/1/WhitelawRecognisingPolitiesCrete2018.pdf", source_tier="university research publication", source_type="scholarly chapter", confidence="medium")
add("Malia (Minoan site)", "Protopalatial settlement, c. 1900–1700 BCE", 50, 50, qualifier="estimated", area_basis="settlement footprint", start=-1900, end=-1700, citation="Whitelaw, 'Recognising Polities in Prepalatial Crete' (UCL, 2018).", url="https://discovery.ucl.ac.uk/10049667/1/WhitelawRecognisingPolitiesCrete2018.pdf", source_tier="university research publication", source_type="scholarly chapter", confidence="medium")
add("Akrotiri", "Middle to early Late Bronze Age, c. 2000–1600 BCE", 20, 20, qualifier="approximate", area_basis="settlement extent", start=-2000, end=-1600, citation="Hellenic Ministry of Culture, Akrotiri of Thera.", url="https://odysseus.culture.gr/h/3/eh351.jsp?obj_id=2410", source_tier="official government", source_type="national heritage site", confidence="low", notes="A newer ministry flyer says the volcanic cover prevents locating the boundary; treat 20 ha as an estimate, not a mapped limit.")
add("Mycenae", "Mycenaean lower town, c. 1600–1100 BCE", 30, 30, qualifier="approximate", area_basis="lower-town footprint", start=-1600, end=-1100, citation="Mycenae Lower Town Excavation, Dickinson College/Athens Archaeological Society.", url="https://mycenae-excavations.org/lower_town.html", source_tier="institutional archaeology project", source_type="excavation project report", confidence="medium")
add("Tiryns", "post-palatial expansion, twelfth century BCE", 25, 25, qualifier="about", area_basis="settlement outside citadel", start=-1200, end=-1100, citation="UNESCO nomination dossier, Archaeological Sites of Mycenae and Tiryns.", url="https://whc.unesco.org/uploads/nominations/941.pdf", source_tier="official heritage dossier", source_type="UNESCO nomination", confidence="high")

# Northeast Africa.
add("Kerma", "Classic Kerma, c. 1750–1500 BCE", 20, None, qualifier="over", area_basis="city footprint", start=-1750, end=-1500, citation="Swiss Archaeological Mission, Kerma city overview.", url="https://www.kerma.ch/staticj/www.kerma.ch/index/index-53.html?Itemid=52&id=11&option=com_content&task=view", source_tier="institutional archaeology project", source_type="excavation project report", confidence="medium")
add("Hierakonpolis", "Naqada IC–IIA, c. 3800–3500 BCE", 32, 37, qualifier="estimated range", area_basis="dispersed settlement footprint", start=-3800, end=-3500, citation="Moeller, The Archaeology of Urbanism in Ancient Egypt (Cambridge University Press, 2016).", url="https://www.cambridge.org/core/books/archaeology-of-urbanism-in-ancient-egypt/origins-of-urban-society/7827A646AACBAEEEFCC7CF442E904D2B", source_tier="university press", source_type="scholarly monograph", confidence="high")
add("Hierakonpolis", "late Predynastic nucleation, c. 3500–3200 BCE", 3.6, 3.6, qualifier="about", area_basis="compact settlement footprint", start=-3500, end=-3200, citation="Moeller, The Archaeology of Urbanism in Ancient Egypt (Cambridge University Press, 2016).", url="https://www.cambridge.org/core/books/archaeology-of-urbanism-in-ancient-egypt/origins-of-urban-society/7827A646AACBAEEEFCC7CF442E904D2B", source_tier="university press", source_type="scholarly monograph", confidence="high", notes="Some of the town may continue under Nile alluvium.")
add("Giza workers' town", "Fourth Dynasty workers' settlement, c. 2570–2470 BCE", 20, 20, qualifier="reported", area_basis="planned settlement swath", start=-2570, end=-2470, citation="Lehner, Archaeological Papers of the American Anthropological Association 30 (2019).", url="https://anthrosource.onlinelibrary.wiley.com/doi/full/10.1111/apaa.12111", confidence="high")
book_add("Basta", "ninth millennium BCE", None, 10, qualifier="approaching", area_basis="settlement footprint", start=-9000, end=-8000, line=2160, confidence="medium")

# North American earthworks and settlements. Enclosure/monumental precinct figures
# are kept explicitly distinct from residential city footprints.
add("Hopewell Mound Group", "Hopewell ceremonial complex, c. 100 BCE–500 CE", 55.34, 55.34, qualifier="reported", area_basis="earthwork-enclosed sacred space", start=-100, end=500, citation="U.S. National Park Service, Hopewell Mound Group.", url="https://www.nps.gov/hocu/learn/historyculture/hopewell-mound-group.htm", source_tier="official government", source_type="national park site report", confidence="high", notes="Ceremonial earthwork extent, not a residential settlement footprint.")
book_add("Newark Earthworks", "Hopewell earthwork complex, c. 100 BCE–500 CE", 518, None, qualifier="over", area_basis="earthwork complex extent", start=-100, end=500, line=3996, confidence="high", notes="Converted and sensibly rounded from more than two square miles; not a residential settlement footprint.")
add("Moundville", "planned Mississippian community, c. 1120–1300 CE", 74.867, 74.867, qualifier="reported", area_basis="palisaded/planned community footprint", start=1120, end=1300, citation="Encyclopedia of Alabama / University of Alabama Museums, Moundville.", url="https://encyclopediaofalabama.org/article/moundville-archaeological-park/", source_tier="university/state reference", source_type="institutional encyclopedia", confidence="high", notes="Converted from 185 acres.")
book_add("Mound Key (Calos)", "Calos capital in the sixteenth century CE", 30, 30, qualifier="present-day extent", area_basis="shell-mound complex", start=1500, end=1599, line=1527, confidence="high")
book_add("Arslantepe", "peak settlement, c. 3300 BCE", None, 5, qualifier="no larger than", area_basis="settlement footprint", start=-3300, end=-3300, line=2884, confidence="medium")


def display_num(value: float) -> str:
    return f"{value:.6f}".rstrip("0").rstrip(".")


def area_display(row: dict[str, object], scale: float, unit: str) -> str:
    lo = row["area_hectares_min"]
    hi = row["area_hectares_max"]
    q = str(row["qualifier"])
    if lo is None and hi is None:
        return "unknown"
    if lo is not None and hi is not None and float(lo) != float(hi):
        return f"{display_num(float(lo) * scale)}–{display_num(float(hi) * scale)} {unit}"
    value = float(lo if lo is not None else hi) * scale
    prefixes = {
        "over": "over ",
        "at least": "at least ",
        "approaching": "approaching ",
        "no larger than": "no more than ",
    }
    return f"{prefixes.get(q, '')}{display_num(value)} {unit}"


def comparator(row: dict[str, object]) -> tuple[str, str, str]:
    lo = row["area_hectares_min"]
    hi = row["area_hectares_max"]
    if lo is None and hi is None:
        return "Unknown — no defensible area estimate", "", ""
    if lo is None:
        value = float(hi)
    elif hi is None:
        value = float(lo)
    else:
        value = (float(lo) + float(hi)) / 2
    if value < 15:
        name, ref, url = "FIFA-recommended football pitches", 0.714, FIFA_URL
    elif value < 35:
        name, ref, url = "× St James's Park", 23, ST_JAMES_URL
    elif value < 80:
        name, ref, url = "× Vatican City", 44, VATICAN_URL
    elif value < 230:
        name, ref, url = "× Hyde Park", 142, HYDE_URL
    elif value < 600:
        name, ref, url = "× Central Park", 341.151, CENTRAL_PARK_URL
    else:
        name, ref, url = "× Richmond Park", 1000, RICHMOND_URL
    ratio = value / ref
    ratio_text = f"{ratio:.1f}" if ratio < 10 else f"{ratio:.0f}"
    prefix = "At least " if hi is None else ("No more than " if lo is None else "About ")
    return f"{prefix}{ratio_text} {name}", display_num(ref), url


def main() -> None:
    with SETTLEMENTS.open(newline="", encoding="utf-8") as handle:
        settlements = list(csv.DictReader(handle))
    ids_by_name = {row["canonical_name"]: row["settlement_id"] for row in settlements}
    unknown_notes = {
        "Altamira Cave": "UNESCO reports a 16-ha buffer zone for Altamira, not the cave-use footprint.",
        "Durrington Walls": "English Heritage states that the overall Durrington Walls settlement size is unknown; the 19-ha henge is not substituted for it.",
        "Tikal": "A 16-km² Tikal survey/mapping window is not the full settlement boundary, which the source says is unknown.",
        "Cuicuilco": "INAH reports about 60.7 ha of surviving evidence, not the total Cuicuilco settlement buried by lava.",
        "Copán": "UNESCO property/park areas were rejected as substitutes for Copán's settlement footprint.",
        "Yaxchilán": "The 986-ha protected Yaxchilán archaeological zone is not a demonstrated urban footprint.",
        "Aguada Fénix": "Aguada Fénix monument dimensions were not treated as a residential settlement area.",
        "Knossos": "Preferred row uses the published urban estimate rather than the much smaller UNESCO property boundary.",
        "Phaistos": "Preferred row uses the published settlement estimate rather than the UNESCO property boundary.",
        "Malia (Minoan site)": "Preferred row uses the published settlement estimate rather than the UNESCO property boundary.",
        "Zakros": "The UNESCO Zakros property boundary was not treated as the ancient settlement footprint.",
        "Abydos": "Abydos whole-site and heritage areas include cemeteries and temples; no defensible city footprint was substituted.",
        "Spiro Mounds": "Spiro's protected acreage includes only part of the support city, so it is not the full settlement footprint.",
    }
    unknown_evidence = {
        "Altamira Cave": ("UNESCO World Heritage Centre, Altamira property and boundary documentation.", "https://whc.unesco.org/en/list/310/"),
        "Durrington Walls": ("English Heritage, Stonehenge reconstructed: the settlement at Durrington Walls.", "https://production.english-heritage.org.uk/visit/places/stonehenge/history-and-stories/stonehenge-reconstructed/"),
        "Tikal": ("University of Pennsylvania, Tikal Reports: mapping and survey limits.", "https://www.jstor.org/stable/j.ctt5vkd30"),
        "Cuicuilco": ("Instituto Nacional de Antropología e Historia, Cuicuilco.", "https://lugares.inah.gob.mx/en/node/5552"),
        "Copán": ("UNESCO/ICOMOS reactive monitoring mission to Copán (2011).", "https://whc.unesco.org/document/116601"),
        "Yaxchilán": ("Mexico federal decree establishing the 986-ha protected Yaxchilán archaeological zone.", "https://sdv.com.mx/dof/716590/"),
        "Aguada Fénix": ("Inomata et al., 'Monumental architecture at Aguada Fénix,' Nature 582 (2020).", "https://www.nature.com/articles/s41586-020-2343-4"),
        "Zakros": ("UNESCO World Heritage Centre, Minoan Palatial Centres maps.", "https://whc.unesco.org/en/list/1733/maps"),
        "Abydos": ("Brown University Archaeology, Abydos site overview.", "https://sites.brown.edu/archaeology/fieldwork/abydos/abydos-site-overview/"),
        "Spiro Mounds": ("Oklahoma Historical Society, Spiro Mounds Archaeological Center.", "https://www.okhistory.org/sites/spiromounds.php"),
    }
    by_name: dict[str, list[dict[str, object]]] = {}
    for row in observations:
        name = str(row["canonical_name"])
        if name not in ids_by_name:
            raise ValueError(f"Unknown settlement name {name}")
        by_name.setdefault(name, []).append(row)
    rows: list[dict[str, object]] = []
    counter = 1
    for settlement in settlements:
        sid = settlement["settlement_id"]
        name = settlement["canonical_name"]
        site_rows = by_name.get(name)
        if not site_rows:
            evidence_citation, evidence_url = unknown_evidence.get(
                name,
                ("No reputable settlement-footprint estimate identified in this research pass.", ""),
            )
            site_rows = [
                {
                    "canonical_name": name,
                    "period_start_year": None,
                    "period_end_year": None,
                    "period_label": "not established",
                    "area_hectares_min": None,
                    "area_hectares_max": None,
                    "qualifier": "unknown",
                    "area_basis": "settlement footprint",
                    "is_preferred": True,
                    "source_tier": "none",
                    "source_type": "research status",
                    "source_citation": evidence_citation,
                    "source_url": evidence_url,
                    "source_locator": "",
                    "confidence": "unknown",
                    "notes": unknown_notes.get(name, "No defensible area estimate was found; left unknown rather than importing an uncited or mismatched boundary."),
                }
            ]
        for source_row in site_rows:
            row = dict(source_row)
            row["observation_id"] = f"A{counter:03d}"
            counter += 1
            row["settlement_id"] = sid
            row["canonical_name"] = name
            row["research_status"] = "known" if row["area_hectares_min"] is not None or row["area_hectares_max"] is not None else "unknown"
            row["area_hectares_display"] = area_display(row, 1, "ha")
            row["area_km2_min"] = None if row["area_hectares_min"] is None else float(row["area_hectares_min"]) / 100
            row["area_km2_max"] = None if row["area_hectares_max"] is None else float(row["area_hectares_max"]) / 100
            row["area_km2_display"] = area_display(row, 0.01, "km²")
            text, ref_area, ref_url = comparator(row)
            row["comparator_text"] = text
            row["comparator_reference_area_ha"] = ref_area
            row["comparator_source_url"] = ref_url
            rows.append(row)

    fields = [
        "observation_id", "settlement_id", "canonical_name", "research_status",
        "period_start_year", "period_end_year", "period_label",
        "area_hectares_min", "area_hectares_max", "area_hectares_display",
        "area_km2_min", "area_km2_max", "area_km2_display", "qualifier",
        "area_basis", "is_preferred", "comparator_text",
        "comparator_reference_area_ha", "comparator_source_url", "source_tier",
        "source_type", "source_citation", "source_url", "source_locator",
        "confidence", "notes",
    ]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} observations covering {len(set(r['settlement_id'] for r in rows))} settlements to {OUTPUT}")


if __name__ == "__main__":
    main()
