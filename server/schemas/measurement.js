import Ajv from 'ajv';
const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['audio'] },
    value: { type: 'number' },
    location: { type: 'string' },
    timestamp: { type: 'string' }
  },
  required: ['type', 'value', 'location'],
  additionalProperties: false
};

export default ajv.compile(schema);
