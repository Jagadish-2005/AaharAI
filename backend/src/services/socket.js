export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room based on role
    socket.on('join', (data) => {
      if (data.role === 'admin') {
        socket.join('admin');
        console.log(`👨‍💼 Admin joined: ${socket.id}`);
      } else if (data.role === 'vendor' && data.vendorId) {
        socket.join(`vendor:${data.vendorId}`);
        console.log(`🏪 Vendor ${data.vendorId} joined: ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}
