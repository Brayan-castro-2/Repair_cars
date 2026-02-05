// Script para generar hashes de contraseñas con bcrypt
const bcrypt = require('bcryptjs');

async function generateHashes() {
    // Contraseña para Joaquín (admin)
    const joaquinPassword = '2040';
    const joaquinHash = await bcrypt.hash(joaquinPassword, 10);

    // Contraseña para Mecánico 1
    const mecanicoPassword = '1234';
    const mecanicoHash = await bcrypt.hash(mecanicoPassword, 10);

    console.log('='.repeat(60));
    console.log('HASHES GENERADOS PARA REPAIR CARS');
    console.log('='.repeat(60));
    console.log('');
    console.log('Usuario: Joaquín (Admin)');
    console.log('Email: joaquin@repaircar.com');
    console.log('Contraseña: 2040');
    console.log('Hash:', joaquinHash);
    console.log('');
    console.log('-'.repeat(60));
    console.log('');
    console.log('Usuario: Mecánico 1');
    console.log('Email: mecanico1@repaircar.com');
    console.log('Contraseña: 1234');
    console.log('Hash:', mecanicoHash);
    console.log('');
    console.log('='.repeat(60));
}

generateHashes().catch(console.error);
