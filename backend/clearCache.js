// Clear require cache for Invoice model
delete require.cache[require.resolve('./models/Invoice')];

console.log('Invoice model cache cleared');
console.log('Please restart the server to apply changes');
