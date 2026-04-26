// XPTV Source: hsex.icu (好色TV)
// HTML结构：video ID from <a href>, thumb from background-image style, title from h5 > a

const BASE = 'https://hsex.icu';

async function getLocalInfo() {
  return jsonify({ ver: 1, name: '好色TV', api: 'hsex', type: 3 });
}

async function getConfig() {
  return jsonify({
    ver: 1,
    title: '好色TV',
    site: BASE,
    tabs: [
      { name: '视频列表', ext: { cid: 'latest' } },
      { name: '周榜',     ext: { cid: 'weekly' } },
      { name: '月榜',     ext: { cid: 'monthly' } },
      { name: '5分钟+',    ext: { cid: '5min' } },
      { name: '10分钟+',   ext: { cid: '10min' } },
      { name: '最热',     ext: { cid: 'hot' } },
    ]
  });
}

async function getCards(ext) {
  ext = argsify(ext);
  const page = parseInt(ext.page || 1);
  const { cid, text, wd, sort } = ext;
  const keyword = text || wd || '';

  let baseUrl;
  if (cid === 'latest')  baseUrl = `${BASE}/list`;
  else if (cid === 'weekly')  baseUrl = `${BASE}/top7_list`;
  else if (cid === 'monthly') baseUrl = `${BASE}/top_list`;
  else if (cid === '5min')    baseUrl = `${BASE}/5min_list`;
  else if (cid === '10min')   baseUrl = `${BASE}/long_list`;
  else if (cid === 'hot')     baseUrl = `${BASE}/hot_list`;
  else if (keyword)           baseUrl = `${BASE}/search`;
  else                        baseUrl = `${BASE}/list`;

  // Build URL with page
  let url;
  if (keyword) {
    url = `${baseUrl}.htm?search=${encodeURIComponent(keyword)}&page=${page}`;
  } else {
    // Page 1 for list pages: list-1.htm, top7_list-1.htm etc.
    const pageSuffix = page === 1 ? '-1' : `-${page}`;
    url = `${baseUrl}${pageSuffix}.htm`;
  }

  const resp = await $fetch.get(url);
  const html = resp.data;

  const items = [];

  // Parse each .thumbnail block
  // Structure: <div class="thumbnail"><a href="video-XXXX.htm"><div class="image" style="background-image: url(...)" title="title"><var class="duration">XX:XX</var></div></a><div class="caption title"><h5><a ...>TITLE</a></h5>
  const thumbRe = /<div class="thumbnail">[\s\S]*?<a[^>]+href="(video-\d+\.htm)"[^>]*>[\s\S]*?<div class="image"[^>]+style="[^"]*url\('([^']+)'\)"[^>]*(?:title="([^"]*)")?[\s\S]*?<\/div>[\s\S]*?<\/a>[\s\S]*?<div class="caption title">[\s\S]*?<h5><a[^>]*>([^<]+)<\/a>[\s\S]*?<\/h5>/gi;
  let m;
  while ((m = thumbRe.exec(html)) !== null) {
    const [, href, thumbUrl, imgTitle, h5Title] = m;
    const id = href.match(/video-(\d+)/)?.[1];
    if (!id) continue;
    const title = (h5Title || imgTitle || '').trim();
    if (!title) continue;
    items.push({
      vod_id: id,
      vod_name: title,
      vod_pic: thumbUrl || '',
      vod_remarks: '',
      ext: { id }
    });
  }

  return jsonify({ list: items, page });
}

async function getTracks(ext) {
  ext = argsify(ext);
  const vid = ext.id;
  if (!vid) return jsonify({ list: [], info: {} });

  const resp = await $fetch.get(`${BASE}/video-${vid}.htm`);
  const html = resp.data;

  // Extract m3u8 URL
  const m = html.match(/(https?:\/\/cdn\.hdcdn\.online\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
  if (!m) return jsonify({ list: [], info: { vod_desc: 'No video URL found' } });
  const url = m[1].replace(/&amp;/g, '&');

  // Thumb from poster
  const posterM = html.match(/poster="(https?:\/\/[^"]+)"/);
  const thumb = posterM ? posterM[1].replace(/&amp;/g, '&') : '';

  return jsonify({
    list: [{ title: '默认', tracks: [{ name: '正片', ext: { url } }] }],
    info: { vod_pic: thumb }
  });
}

async function getPlayinfo(ext) {
  ext = argsify(ext);
  const { url } = ext;
  if (!url) return jsonify({ urls: [] });
  return jsonify({ urls: [url], headers: [{ 'User-Agent': 'Mozilla/5.0' }] });
}

async function search(ext) {
  ext = argsify(ext);
  const keyword = ext.text || ext.wd || '';
  if (!keyword) return jsonify({ list: [], page: 1 });
  return getCards({ ...ext, cid: 'latest', page: parseInt(ext.page || 1) });
}
