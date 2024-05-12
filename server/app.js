const express = require('express')
const app = express()
const fs = require('fs')

const http = require('http');
const path = require('path')

//Session
const session = require('express-session')
const Memorystore = require('memorystore')
const cookieParser = require("cookie-parser");
const { count } = require('console')


//Express Setting
app.use(express.static('public'))
app.use('/views', express.static('views'))

async function sqlQuery(query) {
    let promise = new Promise((resolve, reject) => {
        const rows = connection.query(query, (error, rows, fields) => {
            resolve(rows)
        })
    })
    let result = await promise
    return result
}

//body Parser
const bodyParser = require('body-parser');
const { isUndefined } = require('util');
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }))

app.use(cookieParser('Seodang'))

app.use(session({
    secure: true,
    secret: 'SECRET',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        Secure: true
    },
    name: 'data-session',
}))

const cookieConfig = {
    maxAge: 30000,
    path: '/',
    httpOnly: true,
    signed: true
}

//TP1
//<----------Setting---------->

//TP2
//<----------Function---------->
const print = (data) => console.log(data)

async function readFile(path) {
    return await new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        })
    })
}

function forcedMoveCode(url) {
    return `<script>window.location.href = "${url}"</script>`
}

function forcedMoveWithAlertCode(text, url) {
    return `<script>alert(\`${text}\`);window.location.href = "${url}"</script>`
}

function goBackWithAlertCode(text) {
    return `<script>alert("${text}");window.location.href = document.referrer</script>`
}

function goBackCode() {
    return `<script>window.location.href = document.referrer</script>`
}


async function renderFile(req, path, replaceItems = {}) {
    var content = await readFile(path)

    var alertIMG = 'alert'
    if (req.session.isLogined) {
        var alertResult = await sqlQuery(`select * from alert where isRead=0 and listener_num=${req.session.num} limit 1`)
        if (alertResult.length) {
            alertIMG = 'alertPing'
        }
    }
    content = content.replace('{{alert_state}}', alertIMG)

    for (i in replaceItems) {
        content = content.replaceAll(`{{${i}}}`, replaceItems[i])
    }

    return `
        <link rel="icon" href="/img/icon/logo.png"/>
        <script>
            function goBack(){
                window.location.href = document.referrer
            }
        </script>
    ` + content
}

/** res.send(renderFile(...)) */
async function sendRender(req, res, path, replaceItems = {}) {
    res.send(await renderFile(req, path, replaceItems))
}

function isCorrectSQLResult(result) {
    try {
        if (result.length == 0) {
            return false
        }
        return true
    } catch {
        return false
    }
}

//<----------Class---------->
//좌석
class Seat {
    constructor(index) { // 변수 선언시
        this.index = index // 좌석의 고윳값
        this.init()
    }
    init() { // 좌석 데이터 초기화
        this.isWait = false // 참여 대기 여부
        this.isSit = false // 현실 참여 여부
        this.schoolid = null // 학번
    }
}

/** return INDEX of the seat ( or null ) */
function findSeatIndexBySchoolID(schoolid) {
    for (var index in seatData) {
        if (seatData[index].schoolid == schoolid) {
            return index
        }
    }
    return null
}

//<----------Setting---------->
const COUNT_OF_SEAT = 31 // 좌석의 갯수
var seatData = [] // 좌석들을 담을 변수(이하 좌석 리스트)
for (var i = 0; i < COUNT_OF_SEAT; i++) {
    // Seat(i ← 좌석의 고윳값)
    seatData.push(new Seat(i)) // 좌석 리스트에 좌석을 추가
}

//TP3
//<----------Server---------->
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// http://127.0.0.1:5500/ 로 접근시
app.get('/', async (req, res) => {
    // schoolid(학번)라는 데이터를 가져왔을 경우 
    // schoolid 변수를 schoolid로 설정하고 아닐 경우 빈공간으로 처리
    const schoolid = req.session.schoolid ? req.session.schoolid : ''

    // **좌석을 보여주는 부분** <- 이부분에서 핵심
    var seatHTML = '' // 좌석을 보여줄 HTML 코드 초기화
    for (var i in seatData) {
        var index = seatData[i].index // 좌석 리스트의 i번째 인덱스
        var seatState = '' // 좌석 상태 (현실 참여, 참여 대기, 야자 참여)
        if (seatData[i].isWait && seatData[i].isSit) { 
            // 현실 참여이면서 참여 대기일 경우
            seatState = 'check' // 상태를 야자 참여로 설정
        }
        else if (seatData[i].isWait) { // 참여 대기일 경우
            seatState = 'wait' // 상태를 참여 대기로 설정
        }
        else if (seatData[i].isSit) { // 현실 참여일 경우
            seatState = 'sit' // 상태를 현실 참여로 설정
        }
        seatHTML += `
        <a href="/check/${index}">
            <div class="seat ${seatState}">
                <div class="title">${index}</div>
                <div class="content">${seatData[i].schoolid ? seatData[i].schoolid : ''}</div>
            </div>
        </a>`
    }
    
    //HTML 보내기
    await sendRender(req, res, './views/index.html', {
        seat: seatHTML,
        schoolid: schoolid,
    })
})

// 이하 site=127.0.0.1:5500
// http://site/set/schoolid 로 접근시
app.post('/set/schoolid', (req, res) => {
    const schoolid = req.body.schoolid // 전달 받은 학번 데이터
    if (schoolid?.length !== 5) { // 학번이 5글자가 아닐 경우
        // 경고를 주고 http://site/로 강제이동
        res.send(forcedMoveWithAlertCode('학번은 5글자의 형식에 맞는 숫자로 구성되어야 합니다', '/'))
        return
    }
    req.session.schoolid = schoolid // session에 schoolid(학번) 저장
    // 확인 알림을 주고 http://site/
    res.send(forcedMoveWithAlertCode(`학번을 "${schoolid}"로 수정하였습니다`, '/'))
})

// http://site/check/ 으로 접근시
app.get('/check/:index', (req, res) => {
    if (!req.session.schoolid) { // 만약 학번을 설정하지 않았다면
        // 경고를 주고 돌아가게 하기
        res.send(forcedMoveWithAlertCode(`학번을 설정한 후 이용 가능합니다.`, '/'))
        return
    }
    
    const targetSeat = seatData[req.params.index] // 선택한 좌석을 저장
    // 이전에 앉았던 좌석 불러오기(없을 경우에는 null)
    const beforeSeatIndex = findSeatIndexBySchoolID(req.session.schoolid)
    var msg = '출석 요청이 완료되었습니다' // 데이터 처리 후 전달할 메시지
    if (beforeSeatIndex) { // 만약 이전에 앉아있던 좌석이 있다면
        seatData[beforeSeatIndex].init() // 이전에 앉았던 좌석을 초기화
        msg = '좌석 변경 및 출석 요청이 완료되었습니다'
    }

    targetSeat.schoolid = req.session.schoolid // 선택한 좌석에 앉을 학번 설정
    targetSeat.isWait = true // 선택한 좌석의 상태를 대기중으로 설정
    res.send(forcedMoveWithAlertCode(msg, '/'))
})

// http://site/set/data 로 접근시
app.post('/set/data', (req, res) => {
    const data = req.body.data
    // 데이터 형식 ex) [1,0,1,1,...,0]
    for (var i in data) {
        // 받아온 실제 참여 데이터를 각 좌석에 저장
        seatData[i].isSit = Number(data[i]) // 
    }
    res.status(200).send('OK') // 데이터 처리 완료
})

app.listen(5500, () => console.log('Server run https://127.0.0.1:5500'))