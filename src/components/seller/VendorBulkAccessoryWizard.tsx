import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
} from 'lucide-react';
import { DeviceListing, ForeignUseEvidenceBatch, VendorStorefront } from '../../types/marketplace';
import {
  ACCESSORY_STUDIO_PRESETS,
  BULK_ACCESSORY_TYPES,
  BulkAccessoryRowDraft,
  BulkAccessoryType,
  buildListingsFromBulkAccessories,
  createEmptyAccessoryRow,
  validateBulkAccessoryRows,
} from '../../utils/vendorOperations';
import { formatNaira } from '../../utils/marketplace';
import { SmartImage } from '../common/SmartImage';

interface VendorBulkAccessoryWizardProps {
  vendor: VendorStorefront;
  evidenceBatches: ForeignUseEvidenceBatch[];
  onPublishAccessories: (newListings: DeviceListing[]) => void;
  onCancel: () => void;
}

export const VendorBulkAccessoryWizard: React.FC<VendorBulkAccessoryWizardProps> = ({
  vendor,
  evidenceBatches,
  onPublishAccessories,
  onCancel,
}) => {
  const [rows, setRows] = useState<BulkAccessoryRowDraft[]>([
    {
      ...createEmptyAccessoryRow(0),
      accessoryType: 'Charger',
      title: 'Anker 20W USB-C Fast Wall Charger',
      compatibleModels: 'iPhone 13–16, iPad Pro, Samsung S24',
      price: 18500,
      stockQuantity: 10,
      condition: 'New',
    },
    {
      ...createEmptyAccessoryRow(1),
      accessoryType: 'Laptop Sleeve',
      title: 'Tomtoc 14" Padded Protective Laptop Sleeve',
      compatibleModels: 'MacBook Pro 14, Dell XPS 13/14, HP Envy',
      price: 26000,
      stockQuantity: 6,
      condition: 'Foreign-Used',
      imageUrl: ACCESSORY_STUDIO_PRESETS['Laptop Sleeve'],
      brand: 'Tomtoc',
    },
  ]);

  const [batchRef, setBatchRef] = useState<string>(
    evidenceBatches[0]?.batchNumber || 'US-BATCH-2026-ACC'
  );
  const [errors, setErrors] = useState<string[]>([]);

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyAccessoryRow(prev.length)]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<BulkAccessoryRowDraft>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handlePhotoUpload = (id: string, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateRow(id, { imageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateBulkAccessoryRows(rows);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    const createdListings = buildListingsFromBulkAccessories(rows, vendor, batchRef);
    onPublishAccessories(createdListings);
  };

  const totalInventoryValue = rows.reduce(
    (sum, r) => sum + (Number(r.price) || 0) * Math.max(1, Number(r.stockQuantity) || 1),
    0
  );

  return (
    <form
      onSubmit={handleSubmitAll}
      className="bg-white rounded-2xl border border-[#EAE6F0] shadow-sm p-5 space-y-5 text-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#EAE6F0]">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-center justify-center text-[#A981FF] shrink-0">
            <PackagePlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#211B2B]">
              Accessories &amp; Gadgets — Bulk Multi-Item Upload
            </h3>
            <p className="text-xs text-[#716B7B] mt-0.5">
              Add multiple chargers, pouches, cables, screen guards, power banks, and laptop sleeves in one batch.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[11px] font-medium text-[#211B2B] tabular-nums">
            {rows.length} Item{rows.length === 1 ? '' : 's'} · Stock Value{' '}
            {formatNaira(totalInventoryValue)}
          </span>
        </div>
      </div>

      {/* Batch Reference Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
        <div>
          <label className="block font-medium text-[#211B2B] mb-1">
            Import Batch / Supplier Reference
          </label>
          <input
            type="text"
            value={batchRef}
            onChange={(e) => setBatchRef(e.target.value)}
            placeholder="e.g. US-BATCH-2026-ACC"
            className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white font-mono text-[#211B2B]"
          />
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-[11px] text-[#716B7B] leading-relaxed">
            Laptop sleeves &amp; laptop accessories auto-publish to <strong>Laptop Accessories</strong>; phone chargers, pouches, cables, screen guards &amp; power banks publish to <strong>Accessories</strong>.
          </p>
        </div>
      </div>

      {/* Multi-Item Rows */}
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="p-4 rounded-2xl border border-[#EAE6F0] bg-[#FAF9FC] space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#211B2B]">
                <span className="w-5 h-5 rounded-full bg-[#A981FF] text-white text-[11px] flex items-center justify-center">
                  {index + 1}
                </span>
                Accessory Item #{index + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveRow(row.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#FED7D7] text-[#D9534F] hover:bg-[#FFF5F5] text-[11px] font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* 1. Accessory Type */}
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Accessory Type</label>
                <select
                  aria-label={`Item ${index + 1} accessory type`}
                  value={row.accessoryType}
                  onChange={(e) => {
                    const nextType = e.target.value as BulkAccessoryType;
                    updateRow(row.id, {
                      accessoryType: nextType,
                      imageUrl: ACCESSORY_STUDIO_PRESETS[nextType],
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B]"
                >
                  {BULK_ACCESSORY_TYPES.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>
                      {typeOption}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Title */}
              <div className="lg:col-span-2">
                <label className="block font-medium text-[#211B2B] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  aria-label={`Item ${index + 1} title`}
                  value={row.title}
                  onChange={(e) => updateRow(row.id, { title: e.target.value })}
                  placeholder="e.g. Ugreen 100W Braided USB-C Cable"
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B]"
                />
              </div>

              {/* 3. Compatible Models */}
              <div className="lg:col-span-2">
                <label className="block font-medium text-[#211B2B] mb-1">
                  Compatible Models *
                </label>
                <input
                  type="text"
                  required
                  aria-label={`Item ${index + 1} compatible models`}
                  value={row.compatibleModels}
                  onChange={(e) => updateRow(row.id, { compatibleModels: e.target.value })}
                  placeholder="e.g. iPhone 15/16, MacBook Pro, Galaxy S24"
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B]"
                />
              </div>

              {/* 4. Condition */}
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Condition</label>
                <select
                  aria-label={`Item ${index + 1} condition`}
                  value={row.condition}
                  onChange={(e) =>
                    updateRow(row.id, {
                      condition: e.target.value as 'New' | 'Foreign-Used',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B]"
                >
                  <option value="New">New</option>
                  <option value="Foreign-Used">Foreign-Used</option>
                </select>
              </div>

              {/* 5. Price (₦) */}
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Price (₦) *</label>
                <input
                  type="number"
                  min={500}
                  required
                  aria-label={`Item ${index + 1} price`}
                  value={row.price}
                  onChange={(e) => updateRow(row.id, { price: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B] tabular-nums"
                />
              </div>

              {/* 6. Stock Quantity */}
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Stock Qty *</label>
                <input
                  type="number"
                  min={1}
                  required
                  aria-label={`Item ${index + 1} stock quantity`}
                  value={row.stockQuantity}
                  onChange={(e) => updateRow(row.id, { stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B] tabular-nums"
                />
              </div>

              {/* 7. Photo Upload + Preview */}
              <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
                <SmartImage
                  src={row.imageUrl}
                  alt={row.title || row.accessoryType}
                  category="accessories"
                  className="w-14 h-14 rounded-xl object-contain bg-white border border-[#EAE6F0] p-1 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EAE6F0] hover:border-[#A981FF] text-[11px] font-medium text-[#211B2B] cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#A981FF]" />
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(row.id, e.target.files?.[0])}
                      />
                    </label>
                    <span className="text-[11px] text-[#716B7B]">
                      or paste image URL below (studio default preloaded)
                    </span>
                  </div>
                  <input
                    type="text"
                    aria-label={`Item ${index + 1} image URL`}
                    value={row.imageUrl}
                    onChange={(e) => updateRow(row.id, { imageUrl: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#EAE6F0] bg-white text-[11px] text-[#716B7B] truncate"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Another Item Button */}
      <button
        type="button"
        onClick={handleAddRow}
        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#A981FF] bg-[#F5F0FF] hover:bg-[#EDE4FF] text-[#211B2B] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
      >
        <Plus className="w-4 h-4 text-[#A981FF]" />
        Add Another Item
      </button>

      {errors.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Please fix these accessory fields:
          </div>
          {errors.map((err, i) => (
            <div key={i} className="pl-5">
              • {err}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#EAE6F0]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B] font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          Publish All Accessories ({rows.length})
        </button>
      </div>
    </form>
  );
};

export default VendorBulkAccessoryWizard;
