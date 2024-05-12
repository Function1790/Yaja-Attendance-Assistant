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
class Seat {
    constructor(index) {
        this.index = index
        this.init()
    }
    init() {
        this.isWait = false
        this.isSit = false
        this.schoolid = null
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
const COUNT_OF_SEAT = 31
var seatData = []
for (var i = 0; i < COUNT_OF_SEAT; i++) {
    seatData.push(new Seat(i))
}

//TP3
//<----------Server---------->
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', async (req, res) => {
    const schoolid = req.session.schoolid ? req.session.schoolid : ''

    var seatHTML = ''
    for (var i in seatData) {
        var index = seatData[i].index
        var additionalClass = ''
        if (seatData[i].isWait) {
            additionalClass = 'wait'
        }
        if (seatData[i].isSit) {
            additionalClass = 'sit'
        }
        if (seatData[i].isWait && seatData[i].isSit) {
            additionalClass = 'check'
        }
        seatHTML += `
        <a href="/check/${index}">
            <div class="seat ${additionalClass}">
                <div class="title">${index}</div>
                <div class="content">${seatData[i].schoolid ? seatData[i].schoolid : ''}</div>
            </div>
        </a>`
    }
    await sendRender(req, res, './views/index.html', {
        seat: seatHTML,
        schoolid,
    })
})

app.post('/set/schoolid', (req, res) => {
    const body = req.body
    const schoolid = body.schoolid
    if (schoolid?.length !== 5) {
        res.send(forcedMoveWithAlertCode('학번은 5글자의 형식에 맞는 숫자로 구성되어야 합니다', '/'))
        return
    }
    req.session.schoolid = schoolid
    res.send(forcedMoveWithAlertCode(`학번을 "${schoolid}"로 수정하였습니다`, '/'))
})

app.get('/check/:index', (req, res) => {
    if (!req.session.schoolid) {
        res.send(forcedMoveWithAlertCode(`학번을 설정한 후 이용 가능합니다.`, '/'))
        return
    }
    const targetSeat = seatData[req.params.index]
    if (targetSeat.isSit === false) {
        res.send(forcedMoveWithAlertCode(`착석하시오.`, '/'))
        return
    }

    const beforeSeatIndex = findSeatIndexBySchoolID(req.session.schoolid)
    var msg = '출석 요청이 완료되었습니다'
    if (beforeSeatIndex) {
        seatData[beforeSeatIndex].init()
        msg = '좌석 변경 및 출석 요청이 완료되었습니다'
    }
    targetSeat.schoolid = req.session.schoolid
    targetSeat.isWait = true
    res.send(forcedMoveWithAlertCode(msg, '/'))
})

app.post('/set/data', (req, res) => {
    const data = req.body.data
    for (var i in data) {
        seatData[i].isSit = Number(data[i])
    }
    res.status(200).send('OK')
})

app.listen(5500, () => console.log('Server run https://127.0.0.1:5500'))