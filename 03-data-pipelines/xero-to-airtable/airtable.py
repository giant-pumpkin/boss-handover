import os
from invoices import get_invoices
from pyairtable import Api

BASE_ID = "app8H7IMW8gHyQzzn"
TABLE_ID = "tblEvxNYRMA2xfSky"
AT_PAT = os.getenv("AT_PAT")

field_mapping = {
    "InvoiceNumber": "fld80ENdecDiZC8lV",
    "InvoiceID":     "fld1kSXorIZBHJv0F",
    "Contact":       "fldh0DlFJvXX2Joba",
    "Reference":     "fldKqhD3xcQKkkZEV",
    "Status":        "fldeCAvRc6vOuVF4i",
    "DateString":    "fldemgJ8C7Fc69MsC",
    "DueDateString": "fldJLoz665cwLXzE1",
    "Total":         "fld5IZ29qGUgyf3kG",
    "AmountPaid":    "fldmHJGaKIwnKZUfx",
    "AmountDue":     "flddUNaMrbkNcxT8m",
    "CurrencyCode":  "fld15ta4wBoXENwXo",
}

records = []
all_invoices = get_invoices()
for invoice in all_invoices:
    fields = {}
    for field in field_mapping:
        if field == 'Contact':
            fields[field_mapping[field]] = invoice[field]['Name']
        else:
            fields[field_mapping[field]] = invoice[field] # Map Airtable field ID: invoice field value
    
    records.append({
        "fields": fields
    })

result = Api(AT_PAT).table(base_id=BASE_ID, table_name=TABLE_ID).batch_upsert(records=records, key_fields=['fld1kSXorIZBHJv0F'])
print(len(result["createdRecords"]), "created,", len(result["updatedRecords"]), "updated")