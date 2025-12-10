module.exports = {

preset: 'ts-jest',
testEnvironment: 'node',
moduleFileExtensions: ['js', 'json', 'ts'],
rootDir: '',
testRegex: '.test.ts$',
transform: {

'^.+\\.(t|j)s$': 'ts-jest',

},

setupFilesAfterEnv: [],

};