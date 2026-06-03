const {
  createCollectionSchema,
  updateCollectionSchema,
  updateFileSchema,
  fileQuerySchema
} = require('../../validation/schemas');

describe('Validation Schemas – Digital Library', () => {
  describe('createCollectionSchema', () => {
    test('should validate a valid collection', () => {
      const { error, value } = createCollectionSchema.validate({
        name: 'My Collection',
        description: 'Test description',
        color: '#ef4444'
      });
      expect(error).toBeUndefined();
      expect(value.name).toBe('My Collection');
      expect(value.color).toBe('#ef4444');
    });

    test('should require a name', () => {
      const { error } = createCollectionSchema.validate({
        description: 'No name'
      });
      expect(error).toBeDefined();
    });

    test('should reject invalid hex color', () => {
      const { error } = createCollectionSchema.validate({
        name: 'Test',
        color: 'invalid'
      });
      expect(error).toBeDefined();
    });

    test('should use default color when not provided', () => {
      const { value } = createCollectionSchema.validate({ name: 'Test' });
      expect(value.color).toBe('#6366f1');
    });
  });

  describe('updateCollectionSchema', () => {
    test('should validate partial updates', () => {
      const { error, value } = updateCollectionSchema.validate({
        name: 'Updated Name'
      });
      expect(error).toBeUndefined();
      expect(value.name).toBe('Updated Name');
    });

    test('should require at least one field', () => {
      const { error } = updateCollectionSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  describe('updateFileSchema', () => {
    test('should validate file update with tags', () => {
      const { error, value } = updateFileSchema.validate({
        original_name: 'renamed.pdf',
        tags: ['important', 'work'],
        is_favorite: true
      });
      expect(error).toBeUndefined();
      expect(value.tags).toHaveLength(2);
    });

    test('should reject too many tags', () => {
      const { error } = updateFileSchema.validate({
        tags: Array(21).fill('tag')
      });
      expect(error).toBeDefined();
    });

    test('should allow null collection_id', () => {
      const { error, value } = updateFileSchema.validate({
        collection_id: null
      });
      expect(error).toBeUndefined();
      expect(value.collection_id).toBeNull();
    });
  });

  describe('fileQuerySchema', () => {
    test('should use defaults when no params provided', () => {
      const { value } = fileQuerySchema.validate({});
      expect(value.sort_by).toBe('date');
      expect(value.sort_order).toBe('desc');
      expect(value.file_type).toBe('all');
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
    });

    test('should validate sort options', () => {
      const { error, value } = fileQuerySchema.validate({
        sort_by: 'name',
        sort_order: 'asc'
      });
      expect(error).toBeUndefined();
      expect(value.sort_by).toBe('name');
    });

    test('should reject invalid sort_by values', () => {
      const { error } = fileQuerySchema.validate({
        sort_by: 'invalid'
      });
      expect(error).toBeDefined();
    });

    test('should validate file type filter', () => {
      const { error, value } = fileQuerySchema.validate({
        file_type: 'pdf'
      });
      expect(error).toBeUndefined();
      expect(value.file_type).toBe('pdf');
    });
  });
});
