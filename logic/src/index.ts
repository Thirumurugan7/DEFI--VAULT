import { TypeScriptToCairoConverter } from './converter';
import * as fs from 'fs';
import * as path from 'path';

// Step 1: Convert TypeScript file to Cairo
const tsFilePath = path.join('src', `winter.ts`);
const cairoFilePath = path.join(__dirname, '..', 'contract', 'src', `winter.cairo`);

try {
  // Read the TypeScript code from the dynamically named file
  const tsCode = fs.readFileSync(tsFilePath, 'utf8');

  // Convert to Cairo
  const converter = new TypeScriptToCairoConverter(tsCode);
  const cairoCode = converter.convert();

  // Print the result
  console.log('Generated Cairo Code:');
  console.log('-------------------');
  console.log(cairoCode);

  // Save the converted Cairo code to the specified path
  fs.writeFileSync(cairoFilePath, cairoCode);
  console.log(`Cairo code saved to: ${cairoFilePath}`);
} catch (error) {
  console.error(`Error reading or converting TypeScript file at ${tsFilePath}:`, error);
}

// Step 2: Update lib.cairo to use the project name as the module
const libTemplatePath = path.join(__dirname, '..', 'contract', 'src', 'lib.template.cairo');
const libFilePath = path.join(__dirname, '..', 'contract', 'src', 'lib.cairo');
const deployTemplate = path.join(__dirname, '..', 'scripts', 'deploy.template.ts')
const deployFilePath = path.join(__dirname, '..', 'scripts', 'deploy.ts');

try {
  // Read the lib.template.cairo and deploy.template.ts files
  let libContent = fs.readFileSync(libTemplatePath, 'utf8');
  let deployContent = fs.readFileSync(deployTemplate, 'utf8');

  // Replace {{Caironame}} with the actual project name in the templates
  libContent = libContent.replace('{{Caironame}}', 'winter');
  deployContent = deployContent.replace('{{Caironame}}', 'winter');

  // Save the modified content to lib.cairo
  fs.writeFileSync(libFilePath, libContent);
  fs.writeFileSync(deployFilePath, deployContent);
  console.log(`lib.cairo updated with module name: winter`);

  // Step 3: Remove the lib.template.cairo file
  fs.unlinkSync(libTemplatePath);
  fs.unlinkSync(deployTemplate); // Remove deploy.template.ts
  console.log('lib.template.cairo and deploy.template.ts have been removed.');
} catch (error) {
  console.error(`Error updating lib.cairo or deploy.ts:`, error);
}