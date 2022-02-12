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
      userId INT NOT NULL,
      roomId INT NOT NULL,
      message VARCHAR(100) NOT NULL,
      create_date VARCHAR(45) NOT NULL,
      PRIMARY KEY (chatId),
      UNIQUE INDEX chatId_UNIQUE (chatId ASC))`

    conn.query( chat, ( err, result ) => {
      if( err ) throw err
    } )

    const roomUser = `CREATE TABLE IF NOT EXISTS room_user (
      roomId INT NOT NULL ,
      userId INT NOT NULL,
      userGroupString VARCHAR(45) NOT NULL,
      lastChat VARCHAR(45),
      lastChatDate VARCHAR(45),
      create_date VARCHAR(45) NOT NULL)`

    conn.query( roomUser, ( err, result ) => {
      if( err ) throw err
    } )

    const sql2 = `alter table user convert to character set utf8`
    conn.query( sql2, ( err, result ) => {
      if( err ) throw err
    } )

    const sql10 = `alter table chat convert to character set utf8`
    conn.query( sql10, ( err, result ) => {
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
    redisClient.set( res.userId, socket.id )
  } )

  socket.on( "disconnect", () => {
  } )
} )


app.get( '/', ( req, res ) => {
  res.send( 'connect success' )
} )

app.post ( '/makeroom', async ( req, res, next ) => {

  // redisClient.lpush( list, )

  // room 추가
  const userIdGroup = req.body
  const now = moment().valueOf()
  let roomId

  const sql = `INSERT INTO room( create_date )
  VALUES ( '${now}' )`
  await conn.query( sql, async ( err, result ) => {
    if( err ) {
      res.send( {
        code: 404
      } )
      next( err )
    } else {
      roomId = _.get( result, 'insertId' )
      try {
        await pushRoomUser( userIdGroup, roomId )
      } catch( err ) {}
      res.send( {
        code: 200,
        payload: {
          roomId
        }
      } )
    }
  } )
} )

app.post ( '/pushchat', async ( req, res, next ) => {
  const userId = req.body.userId
  const message = req.body.chatValue
  const roomId = req.body.roomId
  
  const now = moment().valueOf()

  let sql = `insert into chat(  userId, message, roomId, create_date ) values ( '${userId}', '${message}', '${roomId}', '${now}' )`
  
  await conn.query( sql, async ( err, result ) => {
    if( err ) {
      res.send( {
        code: 404
      } )
      next( err )
    } else {
      
      res.send( {
        code: 200,
        payload: {
          roomId
        }
      } )
    }
  } )
 
 const toUserIdList = await getAllUserOfRoom( roomId, userId )

 for( const id of toUserIdList ) {
  redisClient.get( id ).then( ( res ) => {
    const socketId = res
    io.to( socketId ).emit( 'chat', {
      fromUserId: userId,
      refreshRoomId: roomId
    } )
  } )
 }
} )



function getAllUserOfRoom( roomId, userId ) {
  return new Promise( ( resolve, reject ) => {
    const sql = `select * from room_user where roomId = '${roomId}' and userId = '${userId}' `

    conn.query( sql, ( err, result ) => {
      if( err ) {
        reject( err )
      } else {
        const parseData = JSON.parse( JSON.stringify( result ) )
        const userGroup = JSON.parse( _.get( parseData, '0.userGroupString' ) )
        resolve( userGroup )
      }
    } )
  
  } )
}


app.get ( '/getroomlist', async ( req, res, next ) => {
  const userId = req.query.userId

  const sql = `select * from room_user where userId = '${ userId }' `
  await conn.query( sql, async ( err, result ) => {
    if( err ) {
      res.send( {
        code: 404
      } )
      next( err )
    } else {
      
      
      
      const roomList = JSON.parse( JSON.stringify( result ) )

      for( const room of roomList ) {
        room.userGroupString = await getString( room.userGroupString )
      }


      res.send( {
        code: 200,
        payload: {
          roomList
        }
      } )
    }
  } )
} )

// async function getProcessdRoomList( roomList ) {
//   return new Promise( async ( resolve, reject ) => {
//     let newRoomList = []
//     let userList
//     for( const room of roomList ) {
//       const parseRoom = JSON.parse( JSON.stringify( room ) )

      

//       const sql = `select * from room_user where roomId = '${ parseRoom.roomId }'`

//       await conn.query( sql, ( err, result ) => {
//         if( err ) {
//           reject( err )
//         } else {

//           const res = JSON.parse( JSON.stringify( result ) 
//           res
//         }
//       } )

//       // newRoomList.push( parseRoom )

      

     

//     }
    
    
//   } )
// }

async function getString( userList ) {
  return new Promise( ( resolve, reject ) => {

    const parseUserList = JSON.parse( userList )
    
    const sql = `select * from user where userId in ( ${ _.join( parseUserList, ',' ) } ) order by name asc`
    conn.query( sql, ( err, result ) => {
      if( err ) {
        reject( err )
      } else {
        const list = JSON.parse( JSON.stringify( result ) )
        const nameStr = _( list ).map( 'name' ).join( ', ' )
        resolve( nameStr ) 
      }
    } )
  } )
}



async function pushRoomUser( userIdGroup, roomId ) {
  const now = moment().valueOf()
  for( const userId of userIdGroup ) {
    
    const sql = `INSERT INTO room_user( roomId, userId, userGroupString, create_date )
    VALUES ( '${roomId}', '${userId}', '${ JSON.stringify( userIdGroup ) }' ,${now} )`

    await conn.query( sql, ( err, result ) => {
      if( err ) {
        throw new Error( err )
      }
    } )
  }
}

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



app.get( '/getchatlist', ( req, res, next ) => {
  const roomId = req.query.roomId
  const sql = `select * from chat where roomId = ${ roomId }`
  conn.query( sql, ( err, result ) => {
    if( err ) {
      res.send( {
        code: 404
      } )
      next( err )
    } else {
      const chatList = JSON.parse( JSON.stringify( result ) )
      res.send( {
        code: 200,
        payload: {
          chatList
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