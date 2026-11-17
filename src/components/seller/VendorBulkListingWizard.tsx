import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Camera,
  CheckCircle2,
  AlertOctagon,
  Layers,
  Smartphone,
  Upload,
} from 'lucide-react';
import {
  Category,
  CosmeticGrade,
  DeviceListing,
  ForeignUseEvidenceBatch,
  PlatformConfig,
  VendorStorefront,
} from '../../types/marketplace';
import {
  BulkDeviceUnitDraft,
  buildGroupedListingFromBulkUnits,
  CENTRAL_PARENT_MODELS,
  CentralModelTemplate,
  createEmptyUnitDraft,
  GroupedParentDraft,
  validateBulkUnitMatrix,
} from '../../utils/vendorBulk';
import { PLAIN_ENGLISH_ISSUE_PRESETS } from '../../utils/simpleEnglish';
import { SmartImage } from '../common/SmartImage';

interface VendorBulkListingWizardProps {
  vendor: VendorStorefront;
  platformConfig: PlatformConfig;
  evidenceBatches: ForeignUseEvidenceBatch[];
  onPublishGroupedListing: (listing: DeviceListing) => void;
  onCancel: () => void;
}

export const VendorBulkListingWizard: React.FC<VendorBulkListingWizardProps> = ({
  vendor,
  platformConfig,
  evidenceBatches,
  onPublishGroupedListing,
  onCancel,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<CentralModelTemplate>(
    CENTRAL_PARENT_MODELS[0]
  );
  const [useCustomModel, setUseCustomModel] = useState(false);

  const [parentDraft, setParentDraft] = useState<GroupedParentDraft>({
    category: CENTRAL_PARENT_MODELS[0].category,
    brand: CENTRAL_PARENT_MODELS[0].brand,
    model: CENTRAL_PARENT_MODELS[0].model,
    modelYear: CENTRAL_PARENT_MODELS[0].modelYear,
    yearMade: CENTRAL_PARENT_MODELS[0].modelYear + 1,
    sourceCountry: 'United States',
    batchReference: evidenceBatches[0]?.batchNumber || 'US-BATCH-2026-041',
    overview: '',
    warrantyDays: 30,
  });

  const [units, setUnits] = useState<BulkDeviceUnitDraft[]>([
    createEmptyUnitDraft(CENTRAL_PARENT_MODELS[0], 0),
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  const activeCategories = platformConfig.categories.filter((c) => c.enabled);

  const handleSelectParentTemplate = (tpl: CentralModelTemplate) => {
    setSelectedTemplate(tpl);
    setUseCustomModel(false);
    setParentDraft((prev) => ({
      ...prev,
      category: tpl.category,
      brand: tpl.brand,
      model: tpl.model,
      modelYear: tpl.modelYear,
      yearMade: tpl.modelYear + 1,
    }));
    setUnits([createEmptyUnitDraft(tpl, 0)]);
    setErrors([]);
  };

  const handleAddAnotherDevice = () => {
    setUnits((prev) => [
      ...prev,
      createEmptyUnitDraft(useCustomModel ? undefined : selectedTemplate, prev.length),
    ]);
  };

  const handleRemoveUnit = (id: string) => {
    if (units.length <= 1) return;
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  const updateUnit = (id: string, patch: Partial<BulkDeviceUnitDraft>) => {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const toggleUnitFault = (id: string, faultLabel: string) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const exists = u.disclosedFaults.includes(faultLabel);
        return {
          ...u,
          disclosedFaults: exists
            ? u.disclosedFaults.filter((f) => f !== faultLabel)
            : [...u.disclosedFaults, faultLabel],
        };
      })
    );
  };

  const handlePhotoUpload = (
    unitId: string,
    slot: 'front' | 'back' | 'sides' | 'defect',
    file?: File
  ) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId
          ? {
              ...u,
              photos: { ...u.photos, [slot]: url },
            }
          : u
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateBulkUnitMatrix(parentDraft, units, platformConfig);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors([]);
    const grouped = buildGroupedListingFromBulkUnits(
      parentDraft,
      units,
      vendor,
      useCustomModel ? undefined : selectedTemplate
    );
    onPublishGroupedListing(grouped);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-6 text-xs"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAE6F0]">
        <div>
          <h3 className="text-base font-semibold text-[#211B2B] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#A981FF]" />
            Grouped Model & Bulk Unit Upload
          </h3>
          <p className="text-[#716B7B] mt-0.5">
            Select a parent model once, then add every individual device with its own grade, battery %, component test status, faults, price, IMEI, and actual photos.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl border border-[#EAE6F0] text-[#4A4356] hover:border-[#A981FF] font-medium"
        >
          Cancel
        </button>
      </div>

      {/* STEP 1: SELECT PARENT MODEL ONCE */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-[#211B2B] text-sm">
            Step 1: Select Parent Model (Central Catalogue)
          </div>
          <button
            type="button"
            onClick={() => setUseCustomModel((v) => !v)}
            className="text-xs font-medium text-[#A981FF] hover:underline"
          >
            {useCustomModel ? '← Choose from Central Catalogue' : 'Enter Custom Model Instead'}
          </button>
        </div>

        {!useCustomModel ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {CENTRAL_PARENT_MODELS.map((tpl) => {
              const active = selectedTemplate.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectParentTemplate(tpl)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                    active
                      ? 'border-2 border-[#A981FF] bg-[#F5F0FF]'
                      : 'border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF]'
                  }`}
                >
                  <SmartImage
                    src={tpl.defaultImage}
                    alt={`${tpl.brand} ${tpl.model}`}
                    category={tpl.category}
                    className="w-full h-16 object-contain rounded-lg bg-white p-1"
                  />
                  <div>
                    <div className="text-[11px] text-[#716B7B]">{tpl.brand}</div>
                    <div className="text-xs font-semibold text-[#211B2B] leading-tight">
                      {tpl.model}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Category</label>
              <select
                value={parentDraft.category}
                onChange={(e) =>
                  setParentDraft((p) => ({ ...p, category: e.target.value as Category }))
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
              >
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Brand</label>
              <input
                type="text"
                value={parentDraft.brand}
                onChange={(e) => setParentDraft((p) => ({ ...p, brand: e.target.value }))}
                placeholder="e.g. Apple, Dell, Google"
                className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-[#211B2B] mb-1">Parent Model</label>
              <input
                type="text"
                value={parentDraft.model}
                onChange={(e) => setParentDraft((p) => ({ ...p, model: e.target.value }))}
                placeholder="e.g. iPhone 13 Pro Max"
                className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white"
              />
            </div>
          </div>
        )}

        {/* Shared Batch & Origin Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block font-medium text-[#211B2B] mb-1">Source Country</label>
            <input
              type="text"
              value={parentDraft.sourceCountry}
              onChange={(e) => setParentDraft((p) => ({ ...p, sourceCountry: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
            />
          </div>
          <div>
            <label className="block font-medium text-[#211B2B] mb-1">
              Import Batch Reference *
            </label>
            <input
              type="text"
              required
              value={parentDraft.batchReference}
              onChange={(e) => setParentDraft((p) => ({ ...p, batchReference: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-[#211B2B] mb-1">Model Year / Made</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                value={parentDraft.modelYear}
                onChange={(e) =>
                  setParentDraft((p) => ({ ...p, modelYear: Number(e.target.value) }))
                }
                aria-label="Model year"
                className="px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
              <input
                type="number"
                value={parentDraft.yearMade}
                onChange={(e) =>
                  setParentDraft((p) => ({ ...p, yearMade: Number(e.target.value) }))
                }
                aria-label="Year made"
                className="px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[#211B2B] mb-1">Warranty (Days)</label>
            <input
              type="number"
              min={7}
              value={parentDraft.warrantyDays}
              onChange={(e) =>
                setParentDraft((p) => ({ ...p, warrantyDays: Number(e.target.value) || 30 }))
              }
              className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
            />
          </div>
        </div>
      </div>

      {/* STEP 2: INDIVIDUAL DEVICE MATRIX */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-[#211B2B] text-sm">
              Step 2: Individual Device Matrix ({units.length} physical unit
              {units.length === 1 ? '' : 's'} under {parentDraft.brand} {parentDraft.model})
            </div>
            <p className="text-[#716B7B]">
              Cosmetic grade describes body wear only. Disclose component status, faults, and photos separately per unit.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddAnotherDevice}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F0FF] border border-[#A981FF] text-[#211B2B] font-semibold hover:bg-[#EAE1FF]"
          >
            <Plus className="w-4 h-4 text-[#A981FF]" />
            Add Physical Unit
          </button>
        </div>

        <div className="space-y-4">
          {units.map((unit, idx) => {
            const storageList = useCustomModel
              ? ['64GB', '128GB', '256GB', '512GB', '1TB']
              : selectedTemplate.storageOptions;
            const colorList = useCustomModel
              ? ['Space Black', 'Silver', 'Deep Purple', 'Sierra Blue', 'Gold']
              : selectedTemplate.colorOptions.map((c) => c.name);

            return (
              <div
                key={unit.id}
                className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EAE6F0]">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#A981FF] text-white text-[11px] font-semibold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#A981FF]" />
                      {parentDraft.brand} {parentDraft.model} — Unit #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#EAE6F0] text-[11px] text-[#4A4356]">
                      {unit.storage} · {unit.color} · {unit.grade}
                    </span>
                  </div>
                  {units.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(unit.id)}
                      className="inline-flex items-center gap-1 text-[#D9534F] hover:underline font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Unit
                    </button>
                  )}
                </div>

                {/* Spec & Price Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Storage</label>
                    <select
                      value={unit.storage}
                      onChange={(e) => updateUnit(unit.id, { storage: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    >
                      {storageList.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Colour</label>
                    <select
                      value={unit.color}
                      onChange={(e) => updateUnit(unit.id, { color: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    >
                      {colorList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Cosmetic Grade</label>
                    <select
                      value={unit.grade}
                      onChange={(e) =>
                        updateUnit(unit.id, { grade: e.target.value as CosmeticGrade })
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    >
                      <option value="Grade A">Grade A (Excellent)</option>
                      <option value="Grade B">Grade B (Great)</option>
                      <option value="Grade C">Grade C (Good)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Price (₦) *</label>
                    <input
                      type="number"
                      min={1000}
                      required
                      value={unit.price}
                      onChange={(e) =>
                        updateUnit(unit.id, { price: Number(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">Stock Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={unit.stockQuantity}
                      onChange={(e) =>
                        updateUnit(unit.id, { stockQuantity: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#211B2B] mb-1">IMEI / Serial *</label>
                    <input
                      type="text"
                      required
                      value={unit.imeiOrSerial}
                      onChange={(e) => updateUnit(unit.id, { imeiOrSerial: e.target.value })}
                      placeholder="358911240..."
                      className="w-full px-2.5 py-2 rounded-xl border border-[#EAE6F0] bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Separate Component Functional Status */}
                <div className="p-3 rounded-xl bg-white border border-[#EAE6F0] space-y-2.5">
                  <div className="font-semibold text-[#211B2B] text-[11px] uppercase tracking-wide">
                    Component Functional Status (Separate from Cosmetic Grade)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[#716B7B] mb-1">
                        Battery Health (%)
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={unit.batteryHealth}
                        onChange={(e) =>
                          updateUnit(unit.id, { batteryHealth: Number(e.target.value) || 85 })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#716B7B] mb-1">Screen</label>
                      <select
                        value={unit.screenStatus}
                        onChange={(e) =>
                          updateUnit(unit.id, { screenStatus: e.target.value as any })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                      >
                        <option value="Original, verified">Original, verified</option>
                        <option value="Replaced OEM">Replaced OEM</option>
                        <option value="Replaced Aftermarket">Replaced Aftermarket</option>
                        <option value="Minor Dead Pixels">Minor Dead Pixels</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#716B7B] mb-1">
                        Face ID / Biometrics
                      </label>
                      <select
                        value={unit.biometricStatus}
                        onChange={(e) =>
                          updateUnit(unit.id, { biometricStatus: e.target.value as any })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                      >
                        <option value="Working">Working</option>
                        <option value="Not working">Not working</option>
                        <option value="Not applicable">Not applicable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#716B7B] mb-1">Cameras</label>
                      <select
                        value={unit.cameraStatus}
                        onChange={(e) =>
                          updateUnit(unit.id, { cameraStatus: e.target.value as any })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                      >
                        <option value="Working">Working</option>
                        <option value="Faulty">Faulty</option>
                        <option value="Not working">Not working</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#716B7B] mb-1">
                        SIM / Network Lock
                      </label>
                      <select
                        value={unit.simStatus}
                        onChange={(e) => updateUnit(unit.id, { simStatus: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#EAE6F0] bg-[#FAF9FC]"
                      >
                        <option value="Unlocked (Physical + eSIM)">Unlocked (Physical + eSIM)</option>
                        <option value="Unlocked (eSIM Only)">Unlocked (eSIM Only)</option>
                        <option value="Carrier Locked">Carrier Locked</option>
                        <option value="SIM Not Working (Wi-Fi Only)">SIM Not Working (Wi-Fi Only)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Disclosed Faults & Repairs */}
                <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] space-y-2">
                  <div className="font-semibold text-[#C53030] flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Disclosed Faults / Repairs (Unit #{idx + 1})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PLAIN_ENGLISH_ISSUE_PRESETS.slice(0, 6).map((preset) => {
                      const active = unit.disclosedFaults.includes(preset.label);
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => toggleUnitFault(unit.id, preset.label)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                            active
                              ? 'bg-[#D9534F] text-white border-[#D9534F]'
                              : 'bg-white text-[#211B2B] border-[#FED7D7]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={unit.customFaultNote}
                    onChange={(e) => updateUnit(unit.id, { customFaultNote: e.target.value })}
                    placeholder="Optional custom fault or repair note for this unit (leave blank if none)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#FED7D7] bg-white text-[#211B2B]"
                  />
                </div>

                {/* Actual Device Photographs per Unit */}
                <div className="p-3 rounded-xl bg-white border border-[#EAE6F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#211B2B] flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#A981FF]" />
                      Actual Device Photographs (Unit #{idx + 1})
                    </span>
                    <span className="text-[11px] text-[#716B7B]">
                      Front, Back, Sides, Defect Close-Up
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        { key: 'front', label: 'Front View' },
                        { key: 'back', label: 'Back View' },
                        { key: 'sides', label: 'Sides / Frame' },
                        { key: 'defect', label: 'Defect Close-up' },
                      ] as const
                    ).map((slot) => {
                      const currentUrl = unit.photos[slot.key];
                      return (
                        <label
                          key={slot.key}
                          className="cursor-pointer rounded-xl border border-dashed border-[#D0BCFC] bg-[#FAF9FC] hover:border-[#A981FF] p-2 flex flex-col items-center justify-center gap-1.5 text-center min-h-[92px]"
                        >
                          {currentUrl ? (
                            <img
                              src={currentUrl}
                              alt={`${slot.label} preview`}
                              className="w-full h-14 object-contain rounded-lg bg-white"
                            />
                          ) : (
                            <Upload className="w-4 h-4 text-[#A981FF]" />
                          )}
                          <span className="text-[11px] font-medium text-[#211B2B]">
                            {currentUrl ? `Change ${slot.label}` : `+ ${slot.label}`}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) =>
                              handlePhotoUpload(unit.id, slot.key, e.target.files?.[0])
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] space-y-1">
          {errors.map((err, i) => (
            <div key={i}>• {err}</div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAE6F0]">
        <button
          type="button"
          onClick={handleAddAnotherDevice}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#A981FF] bg-[#F5F0FF] text-[#211B2B] font-semibold"
        >
          <Plus className="w-4 h-4 text-[#A981FF]" />
          Add Physical Unit
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-[#EAE6F0] text-[#211B2B] font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" />
            Publish Grouped Listing ({units.length} Unit{units.length === 1 ? '' : 's'})
          </button>
        </div>
      </div>
    </form>
  );
};

export default VendorBulkListingWizard;
