import Ajv from 'ajv';
const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lng: { type: 'number', minimum: -180, maximum: 180 }
  },
  required: ['name', 'lat', 'lng'],
  additionalProperties: false
};

export default ajv.compile(schema);
