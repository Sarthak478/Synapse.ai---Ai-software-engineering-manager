const { execSync } = require('child_process');
const fs = require('fs');

try {
  const result = execSync('git ls-files | findstr env', { encoding: 'utf-8', cwd: __dirname });
  fs.writeFileSync('git_env_check.txt', result);
} catch (error) {
  fs.writeFileSync('git_env_check.txt', error.toString());
}
