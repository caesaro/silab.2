// scripts/generate-hash.js
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Sembunyikan input password di terminal
rl._writeToOutput = function _writeToOutput(stringToWrite) {
  if (rl.stdoutMuted)
    rl.output.write("*");
  else
    rl.output.write(stringToWrite);
};

console.log('--- Admin Password Hash Generator ---');
rl.question('Masukkan password baru untuk admin: ', (password) => {
  const saltRounds = 12; // Tingkat keamanan (10-12 sudah sangat baik)
  
  console.log('\n\nMenghasilkan hash...');

  bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
      console.error('Error hashing password:', err);
      rl.close();
      return;
    }
    console.log('\n✅ Hash berhasil dibuat!');
    console.log('============================================================');
    console.log('Simpan hash di bawah ini ke dalam kolom `password` di tabel `users`:');
    console.log(hash);
    console.log('============================================================');
    rl.close();
  });
  rl.stdoutMuted = false;
});
rl.stdoutMuted = true;
