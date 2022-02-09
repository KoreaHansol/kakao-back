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
    id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(45) NOT NULL,
    password VARCHAR(45) NOT NULL,
    name VARCHAR(45) NOT NULL,
    create_date VARCHAR(45) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX email_UNIQUE (email ASC),
    UNIQUE INDEX id_UNIQUE (id ASC))`

    conn.query( sql, ( err, result ) => {
      if( err ) throw err
    } )

    const room = `CREATE TABLE IF NOT EXISTS room (
      id INT NOT NULL AUTO_INCREMENT,
      title VARCHAR(45) NOT NULL,
      owner VARCHAR(45),
      create_date VARCHAR(45) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE INDEX id_UNIQUE (id ASC))`

    conn.query( room, ( err, result ) => {
      if( err ) throw err
    } )
    
    const chat = `CREATE TABLE IF NOT EXISTS chat (
      id INT NOT NULL AUTO_INCREMENT,
      image VARCHAR(45),
      user VARCHAR(45) NOT NULL,
      chat VARCHAR(45) NOT NULL,
      create_date VARCHAR(45) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE INDEX id_UNIQUE (id ASC))`

    conn.query( chat, ( err, result ) => {
      if( err ) throw err
    } )

    const sql2 = `alter table user convert to character set utf8`
    conn.query( sql2, ( err, result ) => {
      if( err ) throw err
    } )
} )

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

// redis
redisClient.on( 'connect', () => {
  console.log( 'redis connect' )
} )


app.use(cors({
  origin: '*'
}))


app.get( '/', ( req, res ) => {
  res.send( 'connect success' )
} )

app.post ( '/makeroom', ( req, res, next ) => {
  console.log( 'makeroom', req.body ) // 그룹으로 지정할 userId List
  // redisClient.lpush( list, )

  // const sql
  // conn.query( sql, ( err, result ) => {
  //   if( err ) {
  //     res.send( {
  //       code: 404
  //     } )
  //     next( err )
  //   } else {
  //     res.send( {
  //       code: 200,
  //       payload: {
  //         result
  //       }
  //     } )
  //   }
  // } )


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