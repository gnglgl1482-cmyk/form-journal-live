// server.mjs
// FORM — 공개 홈페이지용
// Node.js 20 이상 / 외부 패키지 없음
//
// 개인 목록: 방문자의 브라우저에 저장
// 서버: 기사 검색 / 대표 이미지 확인 / 캐시
//
// 로컬 실행: node server.mjs

import http from "node:http";
import https from "node:https";
import dns from "node:dns/promises";
import { createHash } from "node:crypto";

const PORT = Number(process.env.PORT) || 3000;
const NEWS_TTL = 30 * 60 * 1000;

const DEFAULT_ARCHITECTS = [
  {
    id: "heatherwick",
    name: "Heatherwick Studio",
    korean: "토머스 헤더윅",
    country: "United Kingdom",
    keywords: [
      "Thomas Heatherwick",
      "Little Island",
      "Coal Drops Yard",
      "1000 Trees"
    ]
  },
  {
    id: "big",
    name: "Bjarke Ingels",
    korean: "비야케 잉엘스 · BIG",
    country: "Denmark",
    keywords: [
      "Bjarke Ingels Group",
      "CopenHill",
      "LEGO House",
      "VIA 57 West"
    ]
  },
  {
    id: "ando",
    name: "Tadao Ando",
    korean: "안도 다다오",
    country: "Japan",
    keywords: [
      "Church of the Light",
      "Chichu Art Museum",
      "Bourse de Commerce"
    ]
  },
  {
    id: "sanaa",
    name: "SANAA",
    korean: "세지마 가즈요 · 니시자와 류에",
    country: "Japan",
    keywords: [
      "Kazuyo Sejima",
      "Ryue Nishizawa",
      "Rolex Learning Center"
    ]
  },
  {
    id: "chipperfield",
    name: "David Chipperfield",
    korean: "데이비드 치퍼필드",
    country: "United Kingdom",
    keywords: [
      "David Chipperfield Architects",
      "James Simon Galerie",
      "Hepworth Wakefield"
    ]
  },
  {
    id: "kuma",
    name: "Kengo Kuma",
    korean: "구마 겐고",
    country: "Japan",
    keywords: [
      "Kengo Kuma and Associates",
      "V&A Dundee",
      "GC Prostho Museum"
    ]
  }
];

// 이 명단의 수록 범위는 1979~2025년입니다.
// 공식 출처: https://www.pritzkerprize.com/laureates
const PRITZKER = [
  [1979, ["Philip Johnson"]],
  [1980, ["Luis Barragán"]],
  [1981, ["James Stirling"]],
  [1982, ["Kevin Roche"]],
  [1983, ["I. M. Pei"]],
  [1984, ["Richard Meier"]],
  [1985, ["Hans Hollein"]],
  [1986, ["Gottfried Böhm"]],
  [1987, ["Kenzo Tange"]],
  [1988, ["Gordon Bunshaft", "Oscar Niemeyer"]],
  [1989, ["Frank Gehry"]],
  [1990, ["Aldo Rossi"]],
  [1991, ["Robert Venturi"]],
  [1992, ["Álvaro Siza"]],
  [1993, ["Fumihiko Maki"]],
  [1994, ["Christian de Portzamparc"]],
  [1995, ["Tadao Ando"]],
  [1996, ["Rafael Moneo"]],
  [1997, ["Sverre Fehn"]],
  [1998, ["Renzo Piano"]],
  [1999, ["Norman Foster"]],
  [2000, ["Rem Koolhaas"]],
  [2001, ["Jacques Herzog", "Pierre de Meuron"]],
  [2002, ["Glenn Murcutt"]],
  [2003, ["Jørn Utzon"]],
  [2004, ["Zaha Hadid"]],
  [2005, ["Thom Mayne"]],
  [2006, ["Paulo Mendes da Rocha"]],
  [2007, ["Richard Rogers"]],
  [2008, ["Jean Nouvel"]],
  [2009, ["Peter Zumthor"]],
  [2010, ["Kazuyo Sejima", "Ryue Nishizawa"]],
  [2011, ["Eduardo Souto de Moura"]],
  [2012, ["Wang Shu"]],
  [2013, ["Toyo Ito"]],
  [2014, ["Shigeru Ban"]],
  [2015, ["Frei Otto"]],
  [2016, ["Alejandro Aravena"]],
  [2017, ["Rafael Aranda", "Carme Pigem", "Ramon Vilalta"]],
  [2018, ["Balkrishna Doshi"]],
  [2019, ["Arata Isozaki"]],
  [2020, ["Yvonne Farrell", "Shelley McNamara"]],
  [2021, ["Anne Lacaton", "Jean-Philippe Vassal"]],
  [2022, ["Diébédo Francis Kéré"]],
  [2023, ["David Chipperfield"]],
  [2024, ["Riken Yamamoto"]],
  [2025, ["Liu Jiakun"]]
  [2026, ["Smiljan Radić Clarke"]]
];

const LAUREATE_KEYWORDS = {
  "Philip Johnson": ["Glass House"],
  "Luis Barragán": ["Casa Barragan"],
  "I. M. Pei": ["Louvre Pyramid", "Museum of Islamic Art Doha"],
  "Frank Gehry": ["Guggenheim Bilbao", "Walt Disney Concert Hall"],
  "Álvaro Siza": ["Alvaro Siza", "Serralves Museum"],
  "Renzo Piano": ["Renzo Piano Building Workshop", "The Shard"],
  "Norman Foster": ["Foster and Partners"],
  "Rem Koolhaas": ["Office for Metropolitan Architecture", "Seattle Central Library"],
  "Jacques Herzog": ["Herzog de Meuron", "Tate Modern"],
  "Pierre de Meuron": ["Herzog de Meuron", "Tate Modern"],
  "Jørn Utzon": ["Jorn Utzon", "Sydney Opera House"],
  "Zaha Hadid": ["Zaha Hadid Architects", "Heydar Aliyev Center"],
  "Thom Mayne": ["Morphosis Architects"],
  "Richard Rogers": ["Lloyds Building", "Rogers Stirk Harbour"],
  "Jean Nouvel": ["Ateliers Jean Nouvel", "Louvre Abu Dhabi"],
  "Peter Zumthor": ["Therme Vals", "Kolumba", "Steilneset"],
  "Kazuyo Sejima": ["SANAA", "Rolex Learning Center"],
  "Ryue Nishizawa": ["SANAA", "Teshima Art Museum"],
  "Wang Shu": ["Amateur Architecture Studio", "Ningbo History Museum"],
  "Shigeru Ban": ["Shigeru Ban Architects"],
  "Alejandro Aravena": ["ELEMENTAL", "Quinta Monroy"],
  "Rafael Aranda": ["RCR Arquitectes"],
  "Carme Pigem": ["RCR Arquitectes"],
  "Ramon Vilalta": ["RCR Arquitectes"],
  "Balkrishna Doshi": ["BV Doshi", "Sangath"],
  "Yvonne Farrell": ["Grafton Architects"],
  "Shelley McNamara": ["Grafton Architects"],
  "Anne Lacaton": ["Lacaton Vassal"],
  "Jean-Philippe Vassal": ["Lacaton Vassal"],
  "Diébédo Francis Kéré": ["Francis Kere", "Kere Architecture"],
  "Riken Yamamoto": ["Riken Yamamoto Field Shop"],
  "Liu Jiakun": ["Jiakun Architects", "West Village Chengdu"],
  "Smiljan Radić Clarke": ["Smiljan Radic", "Smiljan Radić", "Serpentine Pavilion 2014", "Teatro Regional del Biobio"]
};

const queryCache = new Map();
const queryPending = new Map();
const articleStore = new Map();
const previewCache = new Map();
const previewPending = new Map();
const rateBuckets = new Map();

// --------------------------------------------------
// ユーティリティ / 공통 처리
// --------------------------------------------------

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function norm(value) {
  return String(value).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanText(value, max = 100) {
  return String(value || "")
    .replace(/["\\\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanKeywords(value) {
  const items = Array.isArray(value)
    ? value
    : String(value || "").split(/[,，\n]/);

  const result = [];
  const seen = new Set();

  for (const item of items) {
    if (typeof item !== "string") continue;
    const text = cleanText(item);
    const key = norm(text);
    if (text.length < 2 || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= 8) break;
  }

  return result;
}

function decodeEntities(value = "") {
  const named = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
    nbsp: " ", ndash: "–", mdash: "—", lsquo: "‘",
    rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…"
  };

  return String(value).replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity) => {
      if (!entity.startsWith("#")) {
        return named[entity.toLowerCase()] ?? match;
      }
      const hex = entity[1]?.toLowerCase() === "x";
      const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
  );
}

function stripHtml(value = "") {
  return decodeEntities(
    String(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function shorten(value, max = 600) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  const part = text.slice(0, max);
  const space = part.lastIndexOf(" ");
  return (space > max * .75 ? part.slice(0, space) : part).trimEnd() + "…";
}

function readTag(xml, name) {
  const match = xml.match(
    new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)</" + name + ">", "i")
  );
  if (!match) return "";

  let value = match[1].trim();

  if (value.startsWith("<![CDATA[") && value.endsWith("]]>")) {
    value = value.slice(9, -3);
  }

  return decodeEntities(value).trim();
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(
    "(?:^|\\s)" + name +
    "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"
  ));

  return match
    ? decodeEntities(match[1] ?? match[2] ?? match[3] ?? "")
    : "";
}

function webUrl(value, base) {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function uniqueImages(items) {
  return [...new Set(items.filter(Boolean))].slice(0, 6);
}

function boundedSet(map, key, value, max) {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > max) map.delete(map.keys().next().value);
}

function createLimiter(limit, maxQueue) {
  let active = 0;
  const queue = [];

  return async function run(task) {
    if (active >= limit) {
      if (queue.length >= maxQueue) {
        throw new Error("서버가 혼잡합니다. 잠시 후 다시 시도해주세요.");
      }
      await new Promise(resolve => queue.push(resolve));
    } else {
      active++;
    }

    try {
      return await task();
    } finally {
      const next = queue.shift();
      if (next) next();
      else active--;
    }
  };
}

const limitNews = createLimiter(4, 80);
const limitPreview = createLimiter(3, 60);

// --------------------------------------------------
// 간단한 요청 제한
// 대규모 서비스용 인증 / 방화벽을 대신하지 않습니다.
// --------------------------------------------------

function allowRate(key, limit, windowMs = 60000) {
  const now = Date.now();
  let bucket = rateBuckets.get(key);

  if (!bucket || now >= bucket.until) {
    bucket = { count: 0, until: now + windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count++;
  return bucket.count <= limit;
}

function clientKey(request) {
  if (process.env.RENDER) {
    const forwarded = String(request.headers["x-forwarded-for"] || "");
    const parts = forwarded.split(",").map(x => x.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return request.socket.remoteAddress || "unknown";
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.until) rateBuckets.delete(key);
  }
}, 60000).unref();

// --------------------------------------------------
// 외부 문서 요청
// 사설 / 로컬 네트워크 접근 방지
// --------------------------------------------------

function isPublicIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || b === 0)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

async function getRemoteText(input, redirects = 0) {
  if (redirects > 5) throw new Error("리디렉션 횟수 초과");

  const url = new URL(input);

  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username || url.password
  ) throw new Error("HTTPS 주소만 허용합니다.");

  const addresses = await dns.lookup(url.hostname, {
    family: 4,
    all: true
  });

  if (!addresses.length || addresses.some(a => !isPublicIPv4(a.address))) {
    throw new Error("허용되지 않는 네트워크 주소");
  }

  const ip = addresses[0].address;

  const result = await new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        "User-Agent": "FORM-ArchitectureJournal/1.0",
        "Accept": "text/html,application/rss+xml,application/xml,text/xml",
        "Accept-Encoding": "identity"
      },

      lookup(hostname, options, callback) {
        if (options?.all) callback(null, [{ address: ip, family: 4 }]);
        else callback(null, ip, 4);
      }
    }, response => {
      const status = response.statusCode || 0;

      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        resolve({ redirect: new URL(response.headers.location, url).href });
        return;
      }

      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error("외부 응답 오류: " + status));
        return;
      }

      const chunks = [];
      let size = 0;

      response.on("data", chunk => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) {
          response.destroy(new Error("문서 크기 제한 초과"));
          return;
        }
        chunks.push(chunk);
      });

      response.on("end", () => resolve({
        text: Buffer.concat(chunks).toString("utf8"),
        url: url.href
      }));

      response.on("error", reject);
    });

    const timer = setTimeout(
      () => request.destroy(new Error("외부 요청 시간 초과")),
      10000
    );

    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
  });

  return result.redirect
    ? getRemoteText(result.redirect, redirects + 1)
    : result;
}

// --------------------------------------------------
// RSS 이미지 / 명시적 건축 정보
// --------------------------------------------------

function extractRssImages(item, description, baseUrl) {
  const images = [];

  function add(value) {
    if (!value) return;
    const url = webUrl(value, baseUrl);
    if (url) images.push(url);
  }

  for (const tag of item.match(
    /<(?:media:thumbnail|media:content|enclosure)\b[^>]*>/gi
  ) || []) {
    const type = attribute(tag, "type").toLowerCase();
    const medium = attribute(tag, "medium").toLowerCase();
    const url = attribute(tag, "url");

    if (
      /<media:thumbnail\b/i.test(tag) ||
      type.startsWith("image/") ||
      medium === "image" ||
      (
        /<media:content\b/i.test(tag) &&
        !type && !medium &&
        /\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(url)
      )
    ) add(url);
  }

  add(readTag(item, "News:ImageUrl"));
  add(readTag(item, "News:ThumbnailUrl"));

  const block = readTag(item, "image");

  if (block) {
    add(readTag(block, "url"));
    if (/^https?:\/\//i.test(block)) add(block);
  }

  for (const tag of String(description).match(/<img\b[^>]*>/gi) || []) {
    add(attribute(tag, "src"));
  }

  return uniqueImages(images);
}

function extractFacts(description) {
  const text = String(description || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, " ");

  const lines = decodeEntities(text)
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const facts = {};

  const patterns = [
    ["프로젝트명", /^(?:project|project name)\s*:\s*(.{2,100})$/i],
    ["위치", /^(?:location|address)\s*:\s*(.{2,100})$/i],
    ["용도", /^(?:program|building use|building type)\s*:\s*(.{2,80})$/i],
    ["대지면적", /^site area\s*:\s*([\d,.]+\s*(?:m²|m2|sqm|sq\.?\s*m|square met(?:er|re)s|ft²|sq\.?\s*ft))$/i],
    ["건축면적", /^(?:building footprint|building area)\s*:\s*([\d,.]+\s*(?:m²|m2|sqm|sq\.?\s*m|square met(?:er|re)s|ft²|sq\.?\s*ft))$/i],
    ["연면적", /^(?:gross floor area|total floor area)\s*:\s*([\d,.]+\s*(?:m²|m2|sqm|sq\.?\s*m|square met(?:er|re)s|ft²|sq\.?\s*ft))$/i],
    ["면적", /^area\s*:\s*([\d,.]+\s*(?:m²|m2|sqm|sq\.?\s*m|square met(?:er|re)s|ft²|sq\.?\s*ft))$/i],
    ["준공 연도", /^(?:completion|completion year|completed)\s*:\s*((?:19|20)\d{2})$/i]
  ];

  for (const line of lines) {
    for (const [label, pattern] of patterns) {
      const match = line.match(pattern);
      if (match && !facts[label]) facts[label] = match[1];
    }
  }

  return facts;
}

// --------------------------------------------------
// 뉴스 검색
// --------------------------------------------------

function unwrapNewsUrl(value) {
  const safe = webUrl(value);
  if (!safe) return null;

  const url = new URL(safe);

  if (url.hostname === "bing.com" || url.hostname.endsWith(".bing.com")) {
    const original = url.searchParams.get("url");
    if (original) return webUrl(original);
  }

  return safe;
}

async function searchNews(term) {
  const key = norm(term);
  const cached = queryCache.get(key);

  if (cached && Date.now() - cached.time < NEWS_TTL) {
    return cached.articles;
  }

  if (queryPending.has(key)) return queryPending.get(key);

  const job = limitNews(async () => {
    if (!allowRate("outbound-news", 90)) {
      throw new Error("전체 검색량이 많습니다. 잠시 후 다시 시도해주세요.");
    }

    const url = new URL("https://www.bing.com/news/search");

    url.search = new URLSearchParams({
      q: term + " architecture",
      format: "rss",
      mkt: "en-US",
      setlang: "en-US"
    }).toString();

    const { text } = await getRemoteText(url.href);
    if (!/<rss\b/i.test(text)) throw new Error("RSS 형식 오류");

    const items = text.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
    const articles = [];
    const seen = new Set();

    for (const item of items) {
      const link = unwrapNewsUrl(readTag(item, "link"));
      if (!link || seen.has(link)) continue;
      seen.add(link);

      const description =
        readTag(item, "description") ||
        readTag(item, "content:encoded");

      const published = Date.parse(readTag(item, "pubDate"));

      const article = {
        id: hash(link),
        title: stripHtml(readTag(item, "title")) || "Untitled",
        url: link,
        source:
          stripHtml(readTag(item, "News:Source")) ||
          stripHtml(readTag(item, "source")) ||
          new URL(link).hostname.replace(/^www\./, ""),
        summary: shorten(stripHtml(description)),
        images: extractRssImages(item, description, link),
        facts: extractFacts(description),
        publishedAt: Number.isFinite(published)
          ? new Date(published).toISOString()
          : null
      };

      articles.push(article);
      boundedSet(articleStore, article.id, article, 800);

      if (articles.length >= 12) break;
    }

    boundedSet(queryCache, key, {
      time: Date.now(),
      articles
    }, 400);

    return articles;
  });

  queryPending.set(key, job);

  try {
    return await job;
  } finally {
    queryPending.delete(key);
  }
}

async function collectFeed(name, keywords) {
  const terms = [...new Set([name, ...keywords])];

  const results = await Promise.allSettled(
    terms.map(async term => ({
      term,
      articles: await searchNews(term)
    }))
  );

  const merged = new Map();
  let failed = 0;

  for (const result of results) {
    if (result.status !== "fulfilled") {
      failed++;
      continue;
    }

    const { term, articles } = result.value;

    for (const article of articles) {
      // 캐시된 검색 결과에서도 상세 정보 조회가 가능하도록 복원
      boundedSet(articleStore, article.id, article, 800);

      if (!merged.has(article.id)) {
        merged.set(article.id, {
          ...article,
          matchedTerms: [term]
        });
      } else {
        const existing = merged.get(article.id);
        existing.matchedTerms = [...new Set([...existing.matchedTerms, term])];
        existing.images = uniqueImages([...existing.images, ...article.images]);
      }
    }
  }

  if (failed === terms.length) {
    throw new Error("검색을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  return {
    articles: [...merged.values()]
      .sort((a, b) =>
        (Date.parse(b.publishedAt) || 0) -
        (Date.parse(a.publishedAt) || 0)
      )
      .slice(0, 50),
    failedTerms: failed,
    checkedAt: new Date().toISOString()
  };
}

// --------------------------------------------------
// 원문 대표 이미지 메타정보
// 서버가 검색으로 확인한 기사만 조회합니다.
// --------------------------------------------------

function extractPreviewImages(html, baseUrl) {
  const primary = [];
  const secondary = [];

  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = (
      attribute(tag, "property") ||
      attribute(tag, "name")
    ).toLowerCase();

    if (![
      "og:image", "og:image:url", "og:image:secure_url",
      "twitter:image", "twitter:image:src"
    ].includes(key)) continue;

    const image = webUrl(attribute(tag, "content"), baseUrl);
    if (!image) continue;

    if (key.startsWith("og:")) primary.push(image);
    else secondary.push(image);
  }

  return uniqueImages([...primary, ...secondary]);
}

async function getArticleWithPreview(id) {
  const article = articleStore.get(id);
  if (!article) return null;

  const cached = previewCache.get(id);

  if (cached && Date.now() - cached.time < cached.ttl) {
    return {
      ...article,
      images: uniqueImages([...cached.images, ...article.images])
    };
  }

  if (previewPending.has(id)) return previewPending.get(id);

  const job = limitPreview(async () => {
    let images = [];
    let ttl = 5 * 60 * 1000;

    try {
      if (!allowRate("outbound-preview", 90)) {
        throw new Error("이미지 확인 요청이 많습니다.");
      }

      const page = await getRemoteText(article.url);
      images = extractPreviewImages(page.text, page.url);
      if (images.length) ttl = 60 * 60 * 1000;
    } catch (error) {
      console.log("[이미지 확인 불가]", article.source, error.message);
    }

    boundedSet(previewCache, id, {
      time: Date.now(),
      ttl,
      images
    }, 400);

    return {
      ...article,
      images: uniqueImages([...images, ...article.images])
    };
  });

  previewPending.set(id, job);

  try {
    return await job;
  } finally {
    previewPending.delete(id);
  }
}

// --------------------------------------------------
// 홈페이지
// --------------------------------------------------

const HTML = String.raw`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FORM — Follow the Trace</title>
<style>
:root{--ink:#181818;--muted:#858585;--line:#e8e8e8;--soft:#f7f7f7}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
button,input,textarea,select{font:inherit}
button{cursor:pointer}
a{color:inherit}
[hidden]{display:none!important}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid #222;outline-offset:4px}
.wrap{width:min(1240px,calc(100% - 64px));margin:auto}
header{border-bottom:1px solid var(--line)}
.nav{height:76px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.logo{text-decoration:none;font-size:28px;font-weight:750;letter-spacing:-1.8px}
.nav-note{color:var(--muted);font-size:10px}
.hero{padding:76px 0 60px}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase}
.hero h1{margin:28px 0 22px;font-size:clamp(48px,7.4vw,88px);font-weight:650;line-height:1.07;letter-spacing:-4.6px}
.hero-subtitle{margin:0;color:var(--muted);font-size:13px}
.tabs{display:flex;gap:26px;border-bottom:1px solid var(--line);margin-bottom:28px}
.tab{padding:14px 0;border:0;border-bottom:2px solid transparent;background:white;color:var(--muted);font-size:13px}
.tab.active{color:var(--ink);border-bottom-color:var(--ink)}
.section-top{display:flex;justify-content:space-between;gap:16px;margin-bottom:20px}
.section-top h2{margin:0;font-size:11px;letter-spacing:1.5px}
.small{font-size:11px;color:var(--muted)}
.add-form{padding:22px;background:#f8f8f8;margin-bottom:22px}
.add-fields{display:grid;grid-template-columns:1fr 1.5fr auto;gap:12px;align-items:end}
label{display:block;font-size:11px}
input,textarea,select{width:100%;padding:12px 14px;border:1px solid #dedede;border-radius:2px;background:white;color:var(--ink)}
label input,label textarea{margin-top:7px;font-size:12px}
.black-button{padding:12px 18px;border:1px solid var(--ink);border-radius:2px;background:var(--ink);color:white;font-size:12px;white-space:nowrap}
button:disabled{opacity:.5;cursor:not-allowed}
.message{margin:10px 0 0;color:var(--muted);font-size:11px}
.profiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line);margin-bottom:60px}
.profile{padding:23px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.profile.selected{background:#fafafa}
.country{font-size:10px;color:var(--muted);margin-bottom:10px}
.profile h3{margin:0 0 4px;font-size:20px;font-weight:500;letter-spacing:-.6px;overflow-wrap:anywhere}
.profile p{margin:0 0 15px;color:var(--muted);font-size:11px}
.keyword-preview{min-height:38px;margin-bottom:18px;font-size:10px;color:#777;overflow-wrap:anywhere}
.profile-actions{display:flex;gap:8px;flex-wrap:wrap}
.follow,.edit,.delete,.refresh,.light-button{padding:8px 12px;border:1px solid #ddd;border-radius:2px;background:white;color:var(--ink);font-size:11px}
.selected .follow{background:var(--ink);border-color:var(--ink);color:white}
.delete{color:#a04e4e}
.editor{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}
.editor textarea{min-height:110px;resize:vertical}
.editor-actions{display:flex;gap:8px;margin-top:10px}
.feed-top{display:flex;justify-content:space-between;align-items:center;gap:20px}
.feed-top h2{margin:0;font-size:31px;font-weight:500;letter-spacing:-1.3px}
.search{margin-top:22px;padding:15px 0;border:0;border-bottom:1px solid #ccc;border-radius:0;font-size:13px}
.status{margin:15px 0 28px;min-height:20px;color:var(--muted);font-size:11px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px 28px;padding-bottom:80px}
.card{min-width:0}
.thumb{display:block;aspect-ratio:4/3;overflow:hidden;background:var(--soft);text-decoration:none}
.thumb img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .5s}
.thumb:hover img{transform:scale(1.035)}
.placeholder{width:100%;height:100%;display:grid;place-items:center;color:#999;font-size:10px;letter-spacing:1px}
.source{margin-top:17px;color:var(--muted);font-size:10px}
.card h3{margin:9px 0 14px;font-size:19px;font-weight:500;line-height:1.45;letter-spacing:-.4px;overflow-wrap:anywhere}
.card h3 a{text-decoration:none}
.card h3 a:hover{text-decoration:underline}
.match{margin-bottom:15px;color:#777;font-size:10px;overflow-wrap:anywhere}
.card-bottom{display:flex;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted);font-size:10px}
.card-names{max-width:75%}
.empty{grid-column:1/-1;padding:65px 20px;background:#fafafa;text-align:center}
.empty strong{display:block;margin-bottom:12px;font-size:26px;font-weight:450}
.empty p{margin:0;color:var(--muted);font-size:13px}
.awards-heading h2{margin:0 0 10px;font-size:32px;font-weight:500;letter-spacing:-1px}
.awards-heading p{margin:0 0 8px;color:var(--muted);font-size:12px}
.awards-tools{display:flex;gap:14px;margin:25px 0}
.awards-tools input{flex:1;min-width:0}
.awards-tools select{width:150px;font-size:12px}
.award-row{display:grid;grid-template-columns:110px 1fr;gap:20px;padding:26px 0;border-top:1px solid var(--line)}
.award-year{font-size:26px;font-weight:500;letter-spacing:-1px}
.award-person{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:7px 0}
.award-name{font-size:18px;letter-spacing:-.4px}
.awards-list{padding-bottom:60px}
footer{padding:28px 0;border-top:1px solid var(--line);color:var(--muted);font-size:10px;line-height:1.9}
.detail-wrap{width:min(1040px,calc(100% - 64px));margin:auto;padding:32px 0 90px}
.back{color:var(--muted);font-size:12px;text-decoration:none}
.detail-heading{padding:44px 0 32px}
.detail-heading h1{margin:18px 0 20px;font-size:clamp(30px,4.6vw,52px);font-weight:500;line-height:1.2;letter-spacing:-1.8px;overflow-wrap:anywhere}
.byline{color:var(--muted);font-size:12px}
.detail-photo{margin:0;width:100%;background:#f8f8f8}
.detail-photo img{display:block;width:100%;height:auto;max-height:760px;object-fit:contain}
.detail-photo .placeholder{min-height:280px;padding:30px;text-align:center;letter-spacing:0;font-size:12px}
.image-note{margin:12px 0 42px;color:var(--muted);font-size:10px}
.detail-section{display:grid;grid-template-columns:170px 1fr;gap:30px;padding:32px 0;border-top:1px solid var(--line)}
.detail-section h2{margin:0;font-size:13px;font-weight:600}
.overview{display:grid;grid-template-columns:100px 1fr;gap:14px 20px;margin:0;font-size:13px}
.overview dt{color:var(--muted)}
.overview dd{margin:0;overflow-wrap:anywhere}
.summary{margin:12px 0 0;font-size:17px;line-height:1.95;overflow-wrap:anywhere;white-space:pre-wrap}
.summary-note{margin-top:16px;color:var(--muted);font-size:11px;line-height:1.9}
.translate-link{display:inline-block;margin-top:20px;padding:10px 16px;border:1px solid #d4d4d4;font-size:12px;text-decoration:none}
.original-link{display:inline-block;padding:13px 23px;background:var(--ink);color:white;font-size:12px;text-decoration:none}
@media(max-width:900px){
.grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.add-fields{grid-template-columns:1fr 1fr}
.add-fields button{grid-column:1/-1}
}
@media(max-width:600px){
.wrap,.detail-wrap{width:calc(100% - 32px)}
.nav{height:65px}.nav-note{display:none}
.hero{padding:56px 0 46px}
.hero h1{font-size:clamp(40px,9vw,54px);letter-spacing:-2.5px}
.eyebrow{font-size:8px;letter-spacing:1.5px}
.add-fields,.profiles,.grid{grid-template-columns:1fr}
.add-form{padding:16px}.profile{padding:20px}.keyword-preview{min-height:0}
.feed-top h2{font-size:27px}
.detail-section{grid-template-columns:1fr;gap:20px}
.award-row{grid-template-columns:65px 1fr;gap:10px}
.award-person{align-items:flex-start;flex-direction:column;gap:10px;padding:8px 0 18px}
.award-name{font-size:17px}
.awards-tools select{width:110px}
}
</style>
</head>
<body>
<header>
  <div class="wrap nav">
    <a class="logo" href="#home">FORM.</a>
    <span class="nav-note">YOUR OWN ARCHITECTURE READING ROOM</span>
  </div>
</header>

<main id="home" class="wrap">
  <section class="hero">
    <div class="eyebrow">PEOPLE, PROJECTS AND PERSPECTIVES.</div>
    <h1>Learn from them.<br>Become more.</h1>
    <p class="hero-subtitle">FOLLOW THE TRACE</p>
  </section>

  <nav class="tabs" aria-label="콘텐츠 선택">
    <button id="followingTab" class="tab active" type="button" aria-pressed="true">내 건축가</button>
    <button id="awardsTab" class="tab" type="button" aria-pressed="false">프리츠커 수상자</button>
  </nav>

  <section id="followingPanel">
    <div class="section-top">
      <h2>ARCHITECTS & CONNECTIONS</h2>
      <span id="followCount" class="small"></span>
    </div>

    <form id="addForm" class="add-form">
      <div class="add-fields">
        <label>건축가 / 사무소 이름
          <input id="architectName" placeholder="예: Peter Zumthor" minlength="2" maxlength="80" required>
        </label>
        <label>관련 프로젝트 / 다른 이름 · 쉼표로 구분
          <input id="architectKeywords" placeholder="예: Therme Vals, Kolumba, Steilneset">
        </label>
        <button class="black-button" type="submit">추가하고 팔로우 +</button>
      </div>
      <p id="addMessage" class="message" role="status" aria-live="polite">
        목록은 이 브라우저에 저장됩니다. 친구의 목록에는 영향을 주지 않습니다.
      </p>
    </form>

    <div id="profiles" class="profiles"></div>

    <div class="feed-top">
      <h2>Your reading list.</h2>
      <button id="refresh" class="refresh" type="button">업데이트 ↻</button>
    </div>

    <input id="search" class="search" type="search"
      aria-label="기사 검색" placeholder="기사, 건축가, 매체, 관련 프로젝트 검색">

    <p id="status" class="status" role="status" aria-live="polite">서버에 연결하고 있습니다…</p>
    <div id="feed" class="grid"></div>
  </section>

  <section id="awardsPanel" hidden>
    <div class="awards-heading">
      <div class="eyebrow">THE PRITZKER ARCHITECTURE PRIZE</div>
      <h2>Laureates.</h2>
      <p>1979–2026 수상자 수록 · 공동 수상자 포함</p>
      <p>
        <a href="https://www.pritzkerprize.com/laureates" target="_blank" rel="noopener noreferrer">
          공식 명단 ↗
        </a>
      </p>
      <p>수상자를 추가하면 나의 건축가 목록에 등록됩니다.</p>
    </div>

    <div class="awards-tools">
      <input id="awardSearch" type="search" aria-label="수상자 검색" placeholder="수상자 이름 또는 연도 검색">
      <select id="awardSort" aria-label="수상 연도 정렬">
        <option value="desc">최신순</option>
        <option value="asc">과거순</option>
      </select>
    </div>
    <div id="awardsList" class="awards-list"></div>
  </section>
</main>

<main id="detail" class="detail-wrap" hidden>
  <a class="back" href="#home">← 모든 기사 보기</a>
  <div id="detailContent"></div>
</main>

<footer>
  <div class="wrap">
    FORM. — FOLLOW THE TRACE<br>
    개인 목록은 현재 브라우저에 저장됩니다. 기기 간 동기화는 제공하지 않습니다.<br>
    검색어는 기사 수집을 위해 서버와 Bing News로 전달됩니다.<br>
    기사 소개는 RSS 제공 문구입니다. 기사 및 이미지의 저작권은 각 원 저작권자에게 있습니다.
  </div>
</footer>

<script>
(function () {
  var STATE_KEY = "form-public-state-v1";
  var ARTICLE_KEY = "form-public-articles-v1";

  var catalog = null;
  var state = null;
  var articleCache = new Map();
  var articles = [];
  var initialized = false;
  var initializing = null;
  var loading = false;
  var version = 0;
  var notice = "";
  var storageWarning = "";

  var imageObserver = null;
  var imageCards = new WeakMap();
  var previewRequests = new Map();

  var home = document.getElementById("home");
  var detail = document.getElementById("detail");
  var profiles = document.getElementById("profiles");
  var feed = document.getElementById("feed");
  var search = document.getElementById("search");
  var status = document.getElementById("status");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function norm(value) {
    return String(value).normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/\s+/g, " ").trim();
  }

  function cleanName(value, max) {
    return String(value || "")
      .replace(/["\\\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ").trim().slice(0, max || 80);
  }

  function keywords(value) {
    var items = Array.isArray(value) ? value : String(value || "").split(/[,，\n]/);
    var seen = new Set();

    return items.filter(function (item) {
      return typeof item === "string";
    }).map(function (item) {
      return cleanName(item, 100);
    }).filter(function (item) {
      var key = norm(item);
      if (item.length < 2 || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }

  function validUrl(value) {
    try {
      var url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch (error) {
      return null;
    }
  }

  function dateText(value) {
    return value ? new Date(value).toLocaleDateString("ko-KR") : "발행일 미상";
  }

  async function requestJSON(url, data) {
    var options = { signal: AbortSignal.timeout(120000) };

    if (data !== undefined) {
      options.method = "POST";
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(data);
    }

    var response = await fetch(url, options);
    var result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "요청 실패: " + response.status);
    }

    return result;
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (error) {
      storageWarning = "브라우저에 목록을 저장하지 못했습니다.";
    }
  }

  function saveArticles() {
    try {
      var recent = Array.from(articleCache.values()).slice(-100);
      localStorage.setItem(ARTICLE_KEY, JSON.stringify(recent));
    } catch (error) {
      // 기사 캐시 저장 실패는 검색 기능을 막지 않습니다.
    }
  }

  try {
    var savedArticles = JSON.parse(localStorage.getItem(ARTICLE_KEY) || "[]");
    if (Array.isArray(savedArticles)) {
      savedArticles.forEach(function (a) {
        if (a && /^[a-f0-9]{24}$/.test(a.id) && validUrl(a.url)) {
          articleCache.set(a.id, a);
        }
      });
    }
  } catch (error) {}

  function cacheArticle(article) {
    articleCache.delete(article.id);
    articleCache.set(article.id, article);
    while (articleCache.size > 100) articleCache.delete(articleCache.keys().next().value);
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STATE_KEY) || "null");

      if (saved && Array.isArray(saved.architects) && Array.isArray(saved.followed)) {
        var seen = new Set();

        var list = saved.architects.filter(function (a) {
          if (!a || typeof a.id !== "string" || typeof a.name !== "string") return false;
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return cleanName(a.name).length >= 2;
        }).map(function (a) {
          return {
            id: a.id,
            name: cleanName(a.name),
            korean: cleanName(a.korean || "나의 건축가", 100),
            country: cleanName(a.country || "My collection", 100),
            keywords: keywords(a.keywords)
          };
        });

        state = {
          architects: list,
          followed: saved.followed.filter(function (id) {
            return list.some(function (a) { return a.id === id; });
          })
        };
        return;
      }
    } catch (error) {}

    state = {
      architects: JSON.parse(JSON.stringify(catalog.defaults)),
      followed: []
    };
  }

  function isFollowed(id) {
    return state.followed.includes(id);
  }

  function setTab(name) {
    var awards = name === "awards";
    document.getElementById("followingPanel").hidden = awards;
    document.getElementById("awardsPanel").hidden = !awards;

    var first = document.getElementById("followingTab");
    var second = document.getElementById("awardsTab");

    first.classList.toggle("active", !awards);
    second.classList.toggle("active", awards);
    first.setAttribute("aria-pressed", String(!awards));
    second.setAttribute("aria-pressed", String(awards));
  }

  function toggleFollow(id) {
    if (isFollowed(id)) {
      state.followed = state.followed.filter(function (x) { return x !== id; });
    } else {
      state.followed.push(id);
    }

    saveState();
    renderProfiles();
    renderAwards();
    loadNews();
  }

  function addToMyList(name, related, extra) {
    name = cleanName(name);
    if (name.length < 2) throw new Error("이름을 2자 이상 입력해주세요.");

    var existing = state.architects.find(function (a) {
      return norm(a.name) === norm(name);
    });

    if (existing) {
      if (!isFollowed(existing.id)) state.followed.push(existing.id);
      saveState();
      return existing;
    }

    var base = catalog.defaults.find(function (a) {
      return norm(a.name) === norm(name);
    });

    var profile = base ? JSON.parse(JSON.stringify(base)) : {
      id: "person-" + (
        window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2)
      ),
      name: name,
      korean: extra && extra.korean || "직접 추가한 건축가",
      country: extra && extra.country || "My collection",
      keywords: keywords(related)
    };

    if (base && keywords(related).length) {
      profile.keywords = keywords(base.keywords.concat(keywords(related)));
    }

    state.architects.push(profile);
    state.followed.push(profile.id);
    saveState();
    return profile;
  }

  function removeArchitect(architect) {
    if (!confirm(
      architect.name + "을(를) 내 목록에서 삭제할까요?\n" +
      "다른 사람의 목록과 프리츠커 수상 이력에는 영향을 주지 않습니다."
    )) return;

    state.architects = state.architects.filter(function (a) {
      return a.id !== architect.id;
    });
    state.followed = state.followed.filter(function (id) {
      return id !== architect.id;
    });

    saveState();
    renderProfiles();
    renderAwards();
    loadNews();
  }

  function renderProfiles() {
    profiles.replaceChildren();

    if (!state.architects.length) {
      var box = el("div", "empty");
      box.append(
        el("strong", "", "Build your own list."),
        el("p", "", "건축가를 입력하거나 프리츠커 수상자를 추가해보세요.")
      );
      profiles.append(box);
    }

    state.architects.forEach(function (architect) {
      var active = isFollowed(architect.id);
      var card = el("article", "profile" + (active ? " selected" : ""));
      var actions = el("div", "profile-actions");

      var follow = el("button", "follow", active ? "✓ 팔로잉" : "+ 팔로우");
      follow.type = "button";
      follow.setAttribute("aria-pressed", String(active));
      follow.setAttribute("aria-label", architect.name + (active ? " 팔로우 해제" : " 팔로우"));
      follow.addEventListener("click", function () { toggleFollow(architect.id); });

      var edit = el("button", "edit", "검색어 수정");
      edit.type = "button";
      edit.setAttribute("aria-expanded", "false");

      var remove = el("button", "delete", "삭제");
      remove.type = "button";
      remove.addEventListener("click", function () { removeArchitect(architect); });

      var editor = el("form", "editor");
      editor.hidden = true;
      var label = el("label", "", "관련 검색어 · 쉼표 또는 줄바꿈으로 구분");
      var textarea = el("textarea");
      textarea.value = architect.keywords.join(", ");
      label.append(textarea);

      var buttons = el("div", "editor-actions");
      var save = el("button", "black-button", "저장");
      save.type = "submit";
      var cancel = el("button", "light-button", "취소");
      cancel.type = "button";
      buttons.append(save, cancel);
      editor.append(label, buttons);

      edit.addEventListener("click", function () {
        editor.hidden = !editor.hidden;
        edit.setAttribute("aria-expanded", String(!editor.hidden));
        if (!editor.hidden) textarea.focus();
      });

      cancel.addEventListener("click", function () {
        editor.hidden = true;
        edit.setAttribute("aria-expanded", "false");
        textarea.value = architect.keywords.join(", ");
      });

      editor.addEventListener("submit", function (event) {
        event.preventDefault();
        architect.keywords = keywords(textarea.value);
        saveState();
        renderProfiles();
        if (isFollowed(architect.id)) loadNews();
      });

      actions.append(follow, edit, remove);
      card.append(
        el("div", "country", architect.country),
        el("h3", "", architect.name),
        el("p", "", architect.korean),
        el("div", "keyword-preview", architect.keywords.length
          ? "함께 검색: " + architect.keywords.join(" · ")
          : "관련 프로젝트 검색어가 없습니다."),
        actions,
        editor
      );
      profiles.append(card);
    });

    document.getElementById("followCount").textContent =
      state.followed.length + "명 팔로우 · 내 목록 " + state.architects.length + "명";
  }

  function renderAwards() {
    if (!catalog || !state) return;

    var list = document.getElementById("awardsList");
    list.replaceChildren();
    var query = norm(document.getElementById("awardSearch").value);
    var asc = document.getElementById("awardSort").value === "asc";
    var count = 0;

    catalog.laureates.slice().sort(function (a, b) {
      return asc ? a.year - b.year : b.year - a.year;
    }).forEach(function (row) {
      var people = row.people.filter(function (person) {
        return !query || norm(person.name).includes(query) || String(row.year).includes(query);
      });
      if (!people.length) return;
      count++;

      var line = el("div", "award-row");
      var peopleBox = el("div");

      people.forEach(function (person) {
        var existing = state.architects.find(function (a) {
          return norm(a.name) === norm(person.name);
        });

        var button = el("button", "light-button", existing
          ? (isFollowed(existing.id) ? "✓ 팔로잉" : "+ 팔로우")
          : "+ 추가하고 팔로우");

        button.type = "button";
        button.addEventListener("click", function () {
          if (existing) {
            toggleFollow(existing.id);
          } else {
            addToMyList(person.name, person.keywords, {
              korean: row.year + " 프리츠커 수상자",
              country: "Pritzker Laureate"
            });
            renderProfiles();
            renderAwards();
            setTab("following");
            loadNews();
          }
        });

        var personLine = el("div", "award-person");
        personLine.append(el("span", "award-name", person.name), button);
        peopleBox.append(personLine);
      });

      line.append(el("div", "award-year", String(row.year)), peopleBox);
      list.append(line);
    });

    if (!count) list.append(el("div", "empty", "검색 결과가 없습니다."));
  }

  function showOneImage(container, images, title, emptyText, onExhaust) {
    var urls = Array.from(new Set(images || [])).map(validUrl).filter(Boolean);
    var index = 0;
    var attempt = 0;
    var fallbackUsed = false;

    async function exhausted() {
      if (!container.isConnected) return;

      if (onExhaust && !fallbackUsed) {
        fallbackUsed = true;
        container.replaceChildren(el("div", "placeholder", "LOADING IMAGE"));

        try {
          var extra = await onExhaust();
          if (!container.isConnected) return;

          var additional = Array.from(new Set(extra || []))
            .map(validUrl)
            .filter(function (url) { return url && !urls.includes(url); });

          if (additional.length) {
            urls = urls.concat(additional);
            next();
            return;
          }
        } catch (error) {}
      }

      if (container.isConnected) {
        container.replaceChildren(el("div", "placeholder", emptyText));
      }
    }

    function next() {
      if (!container.isConnected) return;
      if (index >= urls.length) {
        exhausted();
        return;
      }

      var current = ++attempt;
      var image = new Image();
      var timer;
      image.alt = title + " — 기사 대표 이미지";
      image.referrerPolicy = "no-referrer";
      image.decoding = "async";

      function fail() {
        if (current !== attempt) return;
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        attempt++;
        next();
      }

      image.onload = function () {
        if (current === attempt) clearTimeout(timer);
      };
      image.onerror = fail;

      container.replaceChildren(image);
      timer = setTimeout(fail, 15000);
      image.src = urls[index++];
    }

    next();
  }

  function getPreview(id) {
    if (!previewRequests.has(id)) {
      previewRequests.set(id,
        requestJSON("/api/article/" + id).then(function (remote) {
          var saved = articleCache.get(id);
          if (saved) {
            var updated = Object.assign({}, saved, remote, {
              names: saved.names,
              matchedTerms: saved.matchedTerms
            });
            cacheArticle(updated);
            saveArticles();
          }
          return remote;
        }).catch(function (error) {
          previewRequests.delete(id);
          throw error;
        })
      );
    }
    return previewRequests.get(id);
  }

  function observeImage(node, article) {
    node.append(el("div", "placeholder", "LOADING IMAGE"));

    function start(target, data) {
      var cached = articleCache.get(data.id);

      showOneImage(
        target,
        cached && cached.images || data.images || [],
        data.title,
        "IMAGE UNAVAILABLE",
        async function () {
          var result = await getPreview(data.id);
          return result.images || [];
        }
      );
    }

    if (!("IntersectionObserver" in window)) {
      start(node, article);
      return;
    }

    if (!imageObserver) {
      imageObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var target = entry.target;
          imageObserver.unobserve(target);
          var data = imageCards.get(target);
          imageCards.delete(target);
          if (data && target.isConnected) start(target, data);
        });
      }, { rootMargin: "150px" });
    }

    imageCards.set(node, article);
    imageObserver.observe(node);
  }

  function renderFeed() {
    if (imageObserver) imageObserver.disconnect();
    feed.replaceChildren();

    var query = norm(search.value);
    var filtered = articles.filter(function (a) {
      return norm([
        a.title, a.source,
        (a.names || []).join(" "),
        (a.matchedTerms || []).join(" ")
      ].join(" ")).includes(query);
    });

    var parts = [];
    if (loading) parts.push("건축가와 관련 프로젝트를 검색하고 있습니다…");
    else if (state && state.followed.length) parts.push(filtered.length + "개 기사 · 최신 발행순");
    else parts.push("관심 건축가를 팔로우하거나 직접 추가해보세요.");

    if (notice) parts.push(notice);
    if (storageWarning) parts.push(storageWarning);
    status.textContent = parts.join(" · ");
    document.getElementById("refresh").disabled = loading;

    if (!filtered.length) {
      var box = el("div", "empty");
      box.append(
        el("strong", "", loading ? "Connecting the stories." : "Follow the trace."),
        el("p", "", loading
          ? "첫 검색은 시간이 걸릴 수 있습니다."
          : (query ? "다른 검색어를 입력해보세요." : "건축가를 팔로우하면 관련 기사를 모아드립니다."))
      );
      feed.append(box);
      return;
    }

    filtered.forEach(function (article) {
      var card = el("article", "card");
      var path = "#article=" + article.id;
      var thumb = el("a", "thumb");
      thumb.href = path;
      thumb.target = "_blank";
      thumb.rel = "noopener";
      thumb.setAttribute("aria-label", article.title + " 상세 페이지 열기");

      var heading = el("h3");
      var title = el("a", "", article.title);
      title.href = path;
      title.target = "_blank";
      title.rel = "noopener";
      heading.append(title);

      var bottom = el("div", "card-bottom");
      bottom.append(
        el("span", "card-names", (article.names || []).join(" / ")),
        el("span", "", dateText(article.publishedAt))
      );

      card.append(
        thumb,
        el("div", "source", article.source),
        heading,
        el("div", "match", "발견한 검색어: " + (article.matchedTerms || []).join(" · ")),
        bottom
      );

      feed.append(card);
      observeImage(thumb, article);
    });
  }

  async function loadNews() {
    if (!state) return;
    var current = ++version;
    var selected = state.architects.filter(function (a) { return isFollowed(a.id); });
    articles = [];
    notice = "";
    loading = selected.length > 0;
    renderFeed();
    if (!selected.length) return;

    var cursor = 0;
    var completed = 0;
    var failed = 0;
    var partial = 0;
    var lastError = "";
    var merged = new Map();

    async function worker() {
      while (cursor < selected.length && current === version) {
        var architect = selected[cursor++];

        try {
          var data = await requestJSON("/api/news", {
            name: architect.name,
            keywords: architect.keywords
          });

          if (current !== version) return;
          partial += data.failedTerms || 0;

          data.articles.forEach(function (article) {
            if (!validUrl(article.url)) return;

            if (!merged.has(article.id)) {
              merged.set(article.id, Object.assign({}, article, {
                names: [architect.name],
                matchedTerms: article.matchedTerms || []
              }));
            } else {
              var existing = merged.get(article.id);
              existing.names = Array.from(new Set(existing.names.concat([architect.name])));
              existing.matchedTerms = Array.from(new Set(
                existing.matchedTerms.concat(article.matchedTerms || [])
              ));
              existing.images = Array.from(new Set(
                existing.images.concat(article.images || [])
              )).slice(0, 6);
            }
          });
        } catch (error) {
          if (current !== version) return;
          failed++;
          lastError = error.message;
        } finally {
          if (current === version) {
            completed++;
            articles = Array.from(merged.values())
              .sort(function (a, b) {
                return (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0);
              }).slice(0, 60);

            articles.forEach(cacheArticle);
            saveArticles();

            loading = completed < selected.length;
            var notes = [completed + "/" + selected.length + "명 확인"];
            if (failed) notes.push(failed + "명 검색 실패");
            if (partial) notes.push(partial + "개 검색어 확인 실패");
            if (failed && !articles.length && lastError) notes.push(lastError);
            notice = notes.join(" · ");
            renderFeed();
          }
        }
      }
    }

    await Promise.all([worker(), worker()]);
  }

  async function ensureHome() {
    if (initialized) return;
    if (initializing) return initializing;

    initializing = (async function () {
      try {
        catalog = await requestJSON("/api/catalog");
        loadState();
        initialized = true;
        renderProfiles();
        renderAwards();
        loadNews();
      } catch (error) {
        status.textContent = "서버에 연결하지 못했습니다. 잠시 후 업데이트를 눌러주세요.";
      } finally {
        initializing = null;
      }
    })();

    return initializing;
  }

  function section(title, content) {
    var node = el("section", "detail-section");
    node.append(el("h2", "", title), content);
    return node;
  }

  function paintDetail(article) {
    var content = document.getElementById("detailContent");
    content.replaceChildren();
    document.title = article.title + " — FORM";

    var heading = el("div", "detail-heading");
    heading.append(
      el("div", "eyebrow", "Architecture Journal"),
      el("h1", "", article.title),
      el("div", "byline", article.source + " · " + dateText(article.publishedAt))
    );
    content.append(heading);

    var photo = el("figure", "detail-photo");
    content.append(photo, el("p", "image-note", "이미지 출처: " + article.source));

    showOneImage(
      photo, article.images || [], article.title,
      "이미지를 표시할 수 없습니다. 원문을 확인해주세요.",
      async function () {
        var result = await getPreview(article.id);
        return result.images || [];
      }
    );

    var overviewBox = el("div");
    var overview = el("dl", "overview");

    function row(label, value) {
      overview.append(el("dt", "", label), el("dd", "", value));
    }

    if ((article.names || []).length) row("관련 건축가", article.names.join(" / "));
    if ((article.matchedTerms || []).length) row("발견 검색어", article.matchedTerms.join(" · "));
    row("매체", article.source);
    row("발행일", dateText(article.publishedAt));

    Object.keys(article.facts || {}).forEach(function (label) {
      row(label, article.facts[label]);
    });

    overviewBox.append(
      overview,
      el("p", "summary-note",
        "면적·위치·준공 연도는 RSS에 명시된 경우에만 표시합니다. " +
        "발견 검색어는 관련성을 검증한 정보가 아닙니다.")
    );
    content.append(section("개요", overviewBox));

    var summary = el("div");
    summary.append(
      el("div", "eyebrow", "English · RSS excerpt"),
      el("p", "summary", article.summary ||
        "This feed does not provide a description. Please read the original article."),
      el("p", "summary-note",
        "RSS가 제공한 짧은 기사 소개입니다. AI 요약이 아니며 분량과 언어는 제공 내용에 따라 달라집니다.")
    );

    if (article.summary) {
      var translate = new URL("https://translate.google.com/");
      translate.search = new URLSearchParams({
        sl: "auto", tl: "ko", text: article.summary, op: "translate"
      }).toString();

      var translateLink = el("a", "translate-link", "한국어 번역 보기 ↗");
      translateLink.href = translate.href;
      translateLink.target = "_blank";
      translateLink.rel = "noopener noreferrer";

      summary.append(
        translateLink,
        el("p", "summary-note",
          "클릭하면 위 소개 문구가 Google 번역으로 전달되며 새 탭에서 열립니다.")
      );
    }

    content.append(section("기사 소개", summary));

    var original = el("div");
    var link = el("a", "original-link", "메인 기사 읽기 ↗");
    link.href = validUrl(article.url) || "#home";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    original.append(link);
    content.append(section("원문", original));
  }

  async function showDetail(id) {
    home.hidden = true;
    detail.hidden = false;
    var cached = articleCache.get(id);

    if (cached) {
      paintDetail(cached);
      return;
    }

    var content = document.getElementById("detailContent");
    content.replaceChildren(el("div", "empty", "기사 정보를 불러오고 있습니다…"));

    try {
      var remote = await getPreview(id);
      if (location.hash !== "#article=" + id) return;
      paintDetail(Object.assign({}, remote, { names: [], matchedTerms: [] }));
    } catch (error) {
      content.replaceChildren(el("div", "empty",
        "이 기사는 현재 조회할 수 없습니다. 홈에서 다시 검색한 뒤 열어주세요."));
    }
  }

  function route() {
    var match = location.hash.match(/^#article=([a-f0-9]{24})$/);
    if (match) {
      showDetail(match[1]);
    } else {
      home.hidden = false;
      detail.hidden = true;
      document.title = "FORM — Follow the Trace";
      ensureHome();
    }
  }

  document.getElementById("followingTab").addEventListener("click", function () {
    setTab("following");
  });
  document.getElementById("awardsTab").addEventListener("click", function () {
    setTab("awards");
  });
  document.getElementById("awardSearch").addEventListener("input", renderAwards);
  document.getElementById("awardSort").addEventListener("change", renderAwards);
  search.addEventListener("input", function () {
    if (initialized) renderFeed();
  });

  document.getElementById("addForm").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!initialized) {
      alert("서버 연결이 완료된 뒤 다시 시도해주세요.");
      return;
    }

    var input = document.getElementById("architectName");
    var related = document.getElementById("architectKeywords");
    var message = document.getElementById("addMessage");

    try {
      var profile = addToMyList(input.value, related.value);
      input.value = "";
      related.value = "";
      message.textContent = profile.name + "을(를) 내 목록에 추가했습니다.";
      renderProfiles();
      renderAwards();
      loadNews();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById("refresh").addEventListener("click", function () {
    if (initialized) {
      previewRequests.clear();
      loadNews();
    } else {
      ensureHome();
    }
  });

  window.addEventListener("hashchange", route);

  setInterval(function () {
    if (initialized && !document.hidden && !loading && !detail.hidden) return;
    if (initialized && !document.hidden && !loading) loadNews();
  }, 30 * 60 * 1000);

  route();
})();
</script>
</body>
</html>`;

// --------------------------------------------------
// API / 서버
// --------------------------------------------------

function securityHeaders() {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY"
  };
}

function sendJSON(response, status, data) {
  response.writeHead(status, {
    ...securityHeaders(),
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(data));
}

async function readJSON(request) {
  const contentType = String(request.headers["content-type"] || "").toLowerCase();

  if (!contentType.startsWith("application/json")) {
    const error = new Error("JSON 형식이 필요합니다.");
    error.status = 415;
    throw error;
  }

  const origin = request.headers.origin;

  if (origin) {
    let sameHost = false;
    try {
      sameHost = new URL(origin).host === request.headers.host;
    } catch {}

    if (!sameHost) {
      const error = new Error("허용되지 않는 요청입니다.");
      error.status = 403;
      throw error;
    }
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > 12000) {
      const error = new Error("입력 내용이 너무 깁니다.");
      error.status = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    const error = new Error("입력 내용을 읽지 못했습니다.");
    error.status = 400;
    throw error;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, {
        ...securityHeaders(),
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src https: data:; " +
          "connect-src 'self'; " +
          "base-uri 'self'; " +
          "frame-ancestors 'none'; " +
          "form-action 'self'"
      });
      response.end(HTML);
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJSON(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/favicon.ico") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      const ip = clientKey(request);

      if (
        !allowRate("global-api", 400) ||
        !allowRate("client-api:" + ip, 100)
      ) {
        response.setHeader("Retry-After", "60");
        sendJSON(response, 429, {
          error: "요청이 많습니다. 1분 정도 기다렸다가 다시 시도해주세요."
        });
        return;
      }
    }

    if (request.method === "GET" && url.pathname === "/api/catalog") {
      sendJSON(response, 200, {
        defaults: DEFAULT_ARCHITECTS,
        throughYear: 2026,
        laureates: PRITZKER.map(([year, names]) => ({
          year,
          people: names.map(name => ({
            name,
            keywords: LAUREATE_KEYWORDS[name] || []
          }))
        }))
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/news") {
      if (!allowRate("client-search:" + clientKey(request), 30)) {
        response.setHeader("Retry-After", "60");
        sendJSON(response, 429, {
          error: "검색 요청이 많습니다. 1분 뒤에 다시 시도해주세요."
        });
        return;
      }

      const data = await readJSON(request);

      if (
        typeof data.name !== "string" ||
        data.name.length > 100 ||
        cleanText(data.name, 80).length < 2
      ) {
        sendJSON(response, 400, {
          error: "건축가 이름을 2~80자로 입력해주세요."
        });
        return;
      }

      const name = cleanText(data.name, 80);
      const keywords = cleanKeywords(data.keywords);

      try {
        sendJSON(response, 200, await collectFeed(name, keywords));
      } catch (error) {
        console.error("[검색 실패]", error.message);
        sendJSON(response, 502, {
          error: "뉴스 검색에 실패했습니다. 잠시 후 다시 시도해주세요."
        });
      }
      return;
    }

    const articleMatch = url.pathname.match(/^\/api\/article\/([a-f0-9]{24})$/);

    if (request.method === "GET" && articleMatch) {
      const article = await getArticleWithPreview(articleMatch[1]);

      if (!article) {
        sendJSON(response, 404, {
          error: "홈에서 기사를 다시 검색한 뒤 열어주세요."
        });
        return;
      }

      sendJSON(response, 200, article);
      return;
    }

    sendJSON(response, 404, { error: "페이지를 찾을 수 없습니다." });
  } catch (error) {
    console.error("[서버 오류]", error.message);

    if (!response.headersSent) {
      sendJSON(response, error.status || 500, {
        error: error.status
          ? error.message
          : "서버 처리에 실패했습니다. 잠시 후 다시 시도해주세요."
      });
    } else {
      response.end();
    }
  }
});

// 공개 호스팅을 위해 0.0.0.0으로 실행합니다.
server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("FORM — FOLLOW THE TRACE");
  console.log("로컬 주소: http://localhost:" + PORT);
  console.log("개인 목록은 각 방문자의 브라우저에 저장됩니다.");
  console.log("");
});

server.on("error", error => {
  console.error("서버 실행 실패:", error.message);
});

// END OF FILE