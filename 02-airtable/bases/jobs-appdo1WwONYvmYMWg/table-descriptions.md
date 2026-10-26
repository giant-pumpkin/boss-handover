# Jobs: table descriptions

From the `Documentation - Base - Structure` registry, 2026-10-26. See also [`schema.json`](schema.json).

## Resources (`tbl6eFWh1yj7wjiGL`)

### Purpose

Master SKU and product catalog. Resources define all hardware, software, and consumable items available for deployment.

### Key data

Resources contain: SKU, product name, brand, category, type, images, specs links, and subscription type mappings. Each record represents one unique product model or service offering.

### Relationship

One Resource → many Inventory (physical units). One Resource → many Specs (technical specifications). One Resource → many Subscription types (compatible service offerings). Many Resources → Consumable Movements (for consumable SKUs).

### Scale

Typically 20-50 active resource records covering displays, players, accessories, and services. Grows with product portfolio expansion.

### Lifecycle

- Created: When new SKU is introduced to catalog
- Active: Inventory can be assigned; used in quotes and BOM
- Archived: Marked inactive but existing Inventory and Specs remain linked

### Role in system

(Reference layer for product definitions). Acts as normalization point across entire system. Controls inventory classification, subscription mapping, and quote generation. Every physical unit traces back to a Resource.

### Data consolidation scope

Not applicable. Resources are native to Inventory base; no cross-base syncing.

### Data flow model

Resources → Inventory (physical units assigned). Resources → Specs → Quotes (specs pulled for PDF). Resources → Consumable Movements (is\_consumable flag). Jobs → Inventory → Resources (reverse trace).

### System role

Enforcer. Resources gate all downstream operations. Changes to resource definition impact inventory state, quote generation, and subscription logic. Critical for BOM matching.
