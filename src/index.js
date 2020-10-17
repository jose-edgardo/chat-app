const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

//Rutas para la configuracion de express
const rutaDirectorioPublico = path.join(__dirname, '../public')

//Configuracion para el directorio estatico para el servidor
app.use(express.static(rutaDirectorioPublico))

io.on('connection', (socket) => {
    console.log('Nueva conexion con WebSocket ')

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Mensaje del sistema', 'Bienvenido!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Mensaje del sistema', `${user.username} se a unido a la sala!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (mensaje, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()
        if (filter.isProfane(mensaje)) {
            return callback('Profanaty is not allowed')
        }

        io.to(user.room).emit('message', generateMessage(user.username, mensaje))
        callback()
    })

    socket.on('sendLocation', ({ latitude, longitude }, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${latitude},${longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Mensaje del sistema', `${user.username} a abandonado la sala`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

})


//iniciar el servidor
server.listen(port, () => {
    console.log('Servidor escuchando en el puerto ' + port)
})