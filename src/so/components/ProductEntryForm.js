import React, { useState } from "react";
import { toast } from "react-toastify";

const productOptions = {
  IFPD: {
    specs: ["Android 14", "Android 13"],
    sizes: ["75 inches", "86 inches", "96 inches"],
  },
  "Digital Podium": {
    specs: ["Amplifier"],
    sizes: ["Full Size"],
  },
  "Digital Kiosk": {
    specs: [],
    sizes: ["Full Size"],
  },
  OPS: {
    specs: ["RAM", "ROM"],
    sizes: ["Full Size"],
  },
};

function ProductEntryForm({ onSubmit, onClose }) {
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState({
    productType: "",
    spec: "",
    size: "",
    quantity: "",
    unitPrice: "",
  });

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setCurrentProduct((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "productType" ? { spec: "", size: "" } : {}),
    }));
  };

  const addProduct = () => {
    if (
      !currentProduct.productType ||
      !currentProduct.quantity ||
      !currentProduct.unitPrice
    ) {
      toast.error("Please fill in all required product fields");
      return;
    }

    setProducts((prev) => [...prev, { ...currentProduct, id: Date.now() }]);
    setCurrentProduct({
      productType: "",
      spec: "",
      size: "",
      quantity: "",
      unitPrice: "",
    });
  };

  const removeProduct = (id) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (products.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    const submissionData = {
      products: products.map((product) => ({
        ...product,
        quantity: Number(product.quantity),
        unitPrice: Number(product.unitPrice),
        total: Number(product.quantity) * Number(product.unitPrice),
      })),
      timestamp: new Date(),
    };

    onSubmit(submissionData);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Product Entry Form</h2>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <form onSubmit={handleSubmit}>
          {/* Product Selection Section */}
          <div className="product-input-section">
            <div className="form-group">
              <label>Product Type *</label>
              <select
                name="productType"
                value={currentProduct.productType}
                onChange={handleProductChange}
                required
              >
                <option value="">Select Product</option>
                {Object.keys(productOptions).map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>

            {currentProduct.productType &&
              productOptions[currentProduct.productType].specs.length > 0 && (
                <div className="form-group">
                  <label>Specification</label>
                  <select
                    name="spec"
                    value={currentProduct.spec}
                    onChange={handleProductChange}
                  >
                    <option value="">Select Spec</option>
                    {productOptions[currentProduct.productType].specs.map(
                      (spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

            {currentProduct.productType && (
              <div className="form-group">
                <label>Size</label>
                <select
                  name="size"
                  value={currentProduct.size}
                  onChange={handleProductChange}
                >
                  <option value="">Select Size</option>
                  {productOptions[currentProduct.productType].sizes.map(
                    (size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={currentProduct.quantity}
                onChange={handleProductChange}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Unit Price *</label>
              <input
                type="number"
                name="unitPrice"
                value={currentProduct.unitPrice}
                onChange={handleProductChange}
                min="0"
                step="0.01"
                required
              />
            </div>

            <button
              type="button"
              className="add-product-btn"
              onClick={addProduct}
            >
              Add Product
            </button>
          </div>

          {/* Added Products List */}
          {products.length > 0 && (
            <div className="products-list">
              <h3>Added Products</h3>
              {products.map((product) => (
                <div key={product.id} className="product-entry">
                  <span>
                    {product.productType}
                    {product.spec && ` - ${product.spec}`}
                    {product.size && ` - ${product.size}`}- Qty:{" "}
                    {product.quantity}- Price: ${product.unitPrice}
                  </span>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeProduct(product.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Submit Order
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
        }

        .modal-content {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-title {
          margin: 0 0 1.5rem;
          color: #1e40af;
          font-size: 1.5rem;
        }

        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          border: none;
          background: none;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }

        select,
        input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 1rem;
        }

        .add-product-btn {
          background: #3b82f6;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        }

        .products-list {
          margin: 1.5rem 0;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 4px;
        }

        .product-entry {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .remove-btn {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .cancel-btn,
        .submit-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .cancel-btn {
          background: #e5e7eb;
          color: #374151;
        }

        .submit-btn {
          background: #10b981;
          color: white;
        }
      `}</style>
    </div>
  );
}

export default ProductEntryForm;
