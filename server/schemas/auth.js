import Ajv from 'ajv';
const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_.-]+$' },
    password: { type: 'string', minLength: 8 }
  },
  required: ['username', 'password'],
  additionalProperties: false
};

export default ajv.compile(schema);
