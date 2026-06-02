import Ajv from 'ajv';
const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    location: { type: 'string' },
    proximity: { type: 'string', enum: ['low', 'medium', 'high'] },
    vibe: { type: 'string', enum: ['calme', 'modéré', 'animé', 'bruyant'] },
    notes: { type: 'string' },
    timestamp: { type: 'string' }
  },
  required: ['location', 'proximity', 'vibe'],
  additionalProperties: false
};

export default ajv.compile(schema);
