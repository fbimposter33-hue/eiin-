const express = require('express');
const fetch = require('node-fetch');
const https = require('https');
const app = express();

// মেয়াদোত্তীর্ণ এসএসএল সার্টিফিকেট ইগ্নোর করার জন্য এজেন্ট
const agent = new https.Agent({
    rejectUnauthorized: false
});

// ইমেজ URL তৈরির হেল্পার ফাংশন
function buildImageUrl(oldPath, empId) {
    if (!oldPath || !empId) return oldPath;
    const parts = oldPath.split('/');
    const fileName = parts[parts.length - 1];
    return `https://apps.emis.gov.bd:9701/api/public/hrm/file/view/${empId}/${fileName}/10`;
}

// কমন হেডার্স
const commonHeaders = {
    'Host': 'apps.emis.gov.bd:9701',
    'Connection': 'keep-alive',
    'sec-ch-ua-platform': '"Android"',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'sec-ch-ua': '"Chromium";v="154", "Android WebView";v="154", "Not A(Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'Origin': 'https://apps.emis.gov.bd',
    'X-Requested-With': 'com.xbrowser.play',
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Referer': 'https://apps.emis.gov.bd/',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json'
};

app.get('/', async (req, res) => {
    const eiin = req.query.eiin;

    if (!eiin || !/^\d+$/.test(eiin)) {
        return res.status(400).json({
            status: false,
            message: 'সঠিক eiin প্যারামিটার প্রদান করুন। উদাহরণ: ?eiin=104532'
        });
    }

    try {
        // ১) হেড/প্রিন্সিপাল ফেচ করা (GET)
        const urlHead = `https://apps.emis.gov.bd:9701/api/public/hrm/emp-info/get-head-by-institute-id/0/${eiin}/0`;
        const headRes = await fetch(urlHead, { 
            method: 'GET', 
            headers: commonHeaders,
            agent: agent 
        });
        const headData = await headRes.json();

        if (headData && headData.data && Array.isArray(headData.data)) {
            headData.data.forEach(item => {
                if (item.image) {
                    const empId = item.id || item.empRefId;
                    item.image = buildImageUrl(item.image, empId);
                }
            });
        }

        // ২) সম্পূর্ণ এমপ্লয়ি লিস্ট ফেচ করা (PUT) - আপডেট করা বডি প্যারামিটার
        const urlList = `https://apps.emis.gov.bd:9701/api/public/hrm/emp-info/get-pageable-emp-list-by-institute`;
        const listBody = JSON.stringify({
            listIntParam1: [],
            page: 0,
            size: 1000,
            searchValue: "",
            intParam1: 0,
            intParam2: 0, // এখানে 0 দিয়ে ফিক্স করা হয়েছে যাতে এমপ্লয়ি লিস্ট ফেচ হয়
            stringParam1: eiin
        });

        const listRes = await fetch(urlList, {
            method: 'PUT',
            headers: commonHeaders,
            body: listBody,
            agent: agent
        });
        const listData = await listRes.json();

        if (listData && listData.data && Array.isArray(listData.data.content)) {
            listData.data.content.forEach(item => {
                if (item.image) {
                    const empId = item.id || item.empRefId;
                    item.image = buildImageUrl(item.image, empId);
                }
            });
        }

        // ৩) ফাইনাল JSON রেসপন্স
        return res.status(200).json({
            status: true,
            eiin: eiin,
            headInfo: headData,
            employeeList: listData,
            Api_Owner: '@Al_Nayeem756',
            Telegram: '@Cyber_Force756',
            Developer: '@Al_Nayeem756'
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: 'API Fetch Error: ' + error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
