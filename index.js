const express = require( 'express' )
const app = express()
const cors = require( 'cors' )
const mysql = require( 'mysql' )
const port = 8080
const moment = require( 'moment' )
const http = require( "http" )
const socketIo = require("socket.io")
const redis = require( 'redis' )
const server = http.createServer( app )
const redisClient = redis.createClient()
const _ = require( 'lodash' )
redisClient.connect()

const bodyParser = require( 'body-parser' )
app.use( bodyParser.urlencoded( { extended: true } ) )
app.use( bodyParser.json() )
app.use( cors() )
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

let conn = mysql.createConnection( {
  host: 'localhost',
  user: 'root',
  password: '1234',
} )

conn.connect( ( err ) => {
  if( err ) throw err
  console.log( 'mysql connect' )

  conn.query( 'CREATE DATABASE IF NOT EXISTS kakao', ( err, result ) => {
    if( err ) throw err
  } )

  conn = mysql.createConnection( {
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'kakao'
  } )

  const sql = `CREATE TABLE IF NOT EXISTS user (
    userId INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(45) NOT NULL,
    password VARCHAR(45) NOT NULL,
    name VARCHAR(45) NOT NULL,
    create_date VARCHAR(45) NOT NULL,
    PRIMARY KEY (userId),
    UNIQUE INDEX email_UNIQUE (email ASC),
    UNIQUE INDEX userId_UNIQUE (userId ASC))`

    conn.query( sql, ( err, result ) => {
      if( err ) throw err
    } )

    const room = `CREATE TABLE IF NOT EXISTS room (
      roomId INT NOT NULL AUTO_INCREMENT,
      create_date VARCHAR(45) NOT NULL,
      PRIMARY KEY (roomId),
      UNIQUE INDEX roomId_UNIQUE (roomId ASC))`

    conn.query( room, ( err, result ) => {
      if( err ) throw err
    } )
    
    const chat = `CREATE TABLE IF NOT EXISTS chat (
      chatId INT NOT NULL AUTO_INCREMENT,
      userId VARCHAR(45) NOT NULL,
      message VARCHAR(45) NOT NULL,
      create_date VARCHAR(45) NOT NULL,
      PRIMARY KEY (chatId),
      UNIQUE INDEX chatId_UNIQUE (chatId ASC))`

    conn.query( chat, ( err, result ) => {
      if( err ) throw err
    } )

    const roomUser = `CREATE TABLE IF NOT EXISTS room_user (
      roomId INT NOT NULL ,
      userId INT NOT NULL,
      create_date VARCHAR(45) NOT NULL)`

    conn.query( roomUser, ( err, result ) => {
      if( err ) throw err
    } )

    const sql2 = `alter table user convert to character set utf8`
    conn.query( sql2, ( err, result ) => {
      if( err ) throw err
    } )
} )
// socket
// notify 위해 socket으로는 이벤트 redis로는 publish 하기 위한 데이터 set or get
const io = socketIo( server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
} )

io.on( "connection", ( socket ) => {
  socket.on( 'init', res => {
    const name = _.get( res, 'name' )
    console.log( `${name} 접속` )
    console.log( '접속자 수:', io.engine.clientsCount )
  } )

  socket.on( "disconnect", () => {
    console.log( 'Client disconnected' )
    console.log( '접속자 수:', io.engine.clientsCount )
  } )
} )


app.get( '/', ( req, res ) => {
  res.send( 'connect success' )
} )

app.post ( '/makeroom', ( req, res, next ) => {
  console.log( 'makeroom', req.body ) // 그룹으로 지정할 userId List

  // redisClient.lpush( list, )

  // room 추가
  const userGroup = JSON.stringify( req.body )
  const now = moment().valueOf()
  const sql = `INSERT INTO room( create_date )
  VALUES ( '${userGroup}','${now}' )`
  conn.query( sql, ( err, result ) => {
    if( err ) {
      res.send( {
        code: 404
      } )
      next( err )
    } else {
      res.send( {
        code: 200,
        payload: {
          roomId: _.get( result, 'insertId' )
        }
      } )
    }
  } )
} )

app.post( '/registeruser', ( req, res, next ) => {
  const { name, password, email } = req.body
  const now = moment().valueOf()
  const sql = `INSERT INTO user( name, password, email, create_date )
  VALUES ( '${name}', '${password}', '${email}', '${now}' )`
  conn.query( sql, ( err, result ) => {
    if( err ) {
      res.send( {
        code: 404
      } )
      next( err )
    } else {
      res.send( {
        code: 200,
        payload: {
          result
        }
      } )
    }
  } )
} )

app.post( '/validateuser', ( req, res, next ) => {
  const { email, password } = req.body
  const sql = `select * from user where email = '${email}' and password = '${password}'`
  conn.query( sql, ( err, result ) => {
    if( err ) {
      res.send( {
        code: 404
      } )
      next( err )
    } else {
      res.send( {
        code: 200,
        payload: {
          result
        }
      } )
    }
  } )
} )

app.get( '/getuserlist', ( req, res, next ) => {
  const sql = `select * from user`
  conn.query( sql, ( err, result ) => {
    if( err ) {
      res.send( {
        code: 404
      } )
      next( err )
    } else {
      res.send( {
        code: 200,
        payload: {
          result
        }
      } )
    }
  } )
} )



server.listen( port, () => {
  const host = server.address().address
  const port = server.address().port

  console.log( 'Server is working : PORT - ', port )
} )