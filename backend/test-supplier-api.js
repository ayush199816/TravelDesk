const mongoose = require('mongoose');

async function testSupplierAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://ayush199816_db_user:qM9zcjpCbIUcjTX0@cluster0.ksbksd1.mongodb.net/test');
    console.log('Connected to MongoDB');
    
    // Test if the supplier exists
    const db = mongoose.connection.db;
    const supplierId = '6a04699f766bca586926559e';
    
    // Check in suppliers collection
    const supplier = await db.collection('suppliers').findOne({ _id: new mongoose.Types.ObjectId(supplierId) });
    console.log('Supplier found:', supplier ? 'Yes' : 'No');
    if (supplier) {
      console.log('Supplier name:', supplier.name);
      console.log('Supplier ID:', supplier._id);
    }
    
    // Check if the route should exist
    console.log('\nExpected API endpoint:');
    console.log('GET /api/suppliers/' + supplierId + '/details');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testSupplierAPI();
