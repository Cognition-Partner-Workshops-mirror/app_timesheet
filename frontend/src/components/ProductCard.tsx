
import { useNavigate } from 'react-router-dom';
import {
  Card, CardMedia, CardContent, CardActions, Typography, Button, Chip, Box
} from '@mui/material';
import { ShoppingCart, Visibility } from '@mui/icons-material';
import type { Product } from '../types/api';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: number) => void;
}

// Displays a single product in a card format with image, price, and actions
export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const navigate = useNavigate();
  const inStock = product.stock_quantity > 0;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
        cursor: 'pointer'
      }}
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {/* Product image with fallback placeholder */}
      <CardMedia
        component="img"
        height="200"
        image={product.image_url || 'https://via.placeholder.com/400x200?text=No+Image'}
        alt={product.name}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography gutterBottom variant="h6" component="h2" sx={{ fontSize: '1rem', fontWeight: 600, mb: 0 }}>
            {product.name}
          </Typography>
          {product.featured === 1 && (
            <Chip label="Featured" size="small" color="primary" sx={{ ml: 1 }} />
          )}
        </Box>
        {product.category_name && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {product.category_name}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {product.description}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
            ${product.price.toFixed(2)}
          </Typography>
          <Chip
            label={inStock ? 'In Stock' : 'Out of Stock'}
            size="small"
            color={inStock ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.id}`); }}
        >
          View Details
        </Button>
        {onAddToCart && (
          <Button
            size="small"
            variant="contained"
            startIcon={<ShoppingCart />}
            disabled={!inStock}
            onClick={(e) => { e.stopPropagation(); onAddToCart(product.id); }}
            sx={{ ml: 'auto' }}
          >
            Add to Cart
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
