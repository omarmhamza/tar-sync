import { TarSync, extract } from './index';
import * as fs from 'fs';
import * as StreamPromises from "stream/promises";

// Constants
const TEST_DIR = './test';
const TEST_FILE_NAME_ONE = 'test.txt';
const TEST_FILE_NAME_TWO = 'test2.txt';
const EXTRACT_DIR = './extract';
const DUMMY_DATA = 'hello world';
const EXTRACT_FILE_PATH_ONE = `${EXTRACT_DIR}/${TEST_FILE_NAME_ONE}`;
const EXTRACT_FILE_PATH_TWO = `${EXTRACT_DIR}/${TEST_FILE_NAME_TWO}`;
const TAR_FILE = `${TEST_DIR}.tar`;

// Helper function to create a dummy file
const create_dummy_file = (dirPath: string, filename: string) => {
  if(!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath,{
      recursive: true
    });
  }
  fs.writeFileSync(`${dirPath}/${filename}`, DUMMY_DATA);
};

describe('TarSync', () => {
  // Cleanup after all tests
  afterAll(() => {
    fs.rmSync(TAR_FILE, { recursive: true, force: true });
    fs.rmSync(TAR_FILE + '~', { recursive: true, force: true });
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
  });

  describe('constructor', () => {
    // Test constructor with default options
    it('should initialize with default options if none provided', () => {
      const tarSync = new TarSync('/path/to/dir');
      expect(tarSync.start).toBeDefined();
      expect(tarSync.stop).toBeDefined();
    });
  });

  describe('start', () => {
    // Test start method
    it('should start watching a directory and trigger archiving', async () => { 
      // Create the first dummy file
      create_dummy_file(TEST_DIR, TEST_FILE_NAME_ONE);
      
      // Initialize TarSync with verbose option
      const tarSync = new TarSync(TEST_DIR, { verbose: true });
      
      // Start watching the directory
      tarSync.start();
      
      // Wait for some time for the sync process to trigger
      await new Promise(res => setTimeout(res, 2000));
      
      // Check if the archive file exists
      const archived = fs.existsSync(TAR_FILE);      
      expect(archived).toBeTruthy();

      // Extract the first file from the archive
      const streamFileOne = fs.createReadStream(TAR_FILE);
      const extractStream = extract(EXTRACT_DIR);
      extractStream.on('close',() => {
        const extracted = fs.existsSync(EXTRACT_FILE_PATH_ONE);      
        expect(extracted).toBeTruthy();
        const data = fs.readFileSync(EXTRACT_FILE_PATH_ONE);
        expect(Buffer.from(data).toString()).toBe(DUMMY_DATA);
      });
      extractStream.on('error', () => {
        expect(true).toBe(false); 
      });
      await StreamPromises.pipeline(streamFileOne, extractStream);

      // Create the second dummy file after the first file is archived
      create_dummy_file(TEST_DIR, TEST_FILE_NAME_TWO);

      // Wait for some time to allow detection of the second file
      await new Promise(res => setTimeout(res, 8000));

      // Extract both files from the updated archive
      const streamFileTwo = fs.createReadStream(TAR_FILE);
      const updateExtractStream = extract(EXTRACT_DIR);
      updateExtractStream.on('close',() => {
        // Check if both files are extracted
        const extractedOne = fs.existsSync(EXTRACT_FILE_PATH_ONE);
        const extractedTwo = fs.existsSync(EXTRACT_FILE_PATH_TWO);
        expect(extractedOne).toBeTruthy();
        expect(extractedTwo).toBeTruthy();
        
        // Check the content of both files
        const dataFileOne = fs.readFileSync(EXTRACT_FILE_PATH_ONE);
        expect(Buffer.from(dataFileOne).toString()).toBe(DUMMY_DATA);
        const dataFileTwo = fs.readFileSync(EXTRACT_FILE_PATH_TWO);
        expect(Buffer.from(dataFileTwo).toString()).toBe(DUMMY_DATA);
      });
      updateExtractStream.on('error', () => {
        expect(true).toBe(false); 
      });
      await StreamPromises.pipeline(streamFileTwo, updateExtractStream);

      // Stop watching the directory
      tarSync.stop();
    });
  });
});
