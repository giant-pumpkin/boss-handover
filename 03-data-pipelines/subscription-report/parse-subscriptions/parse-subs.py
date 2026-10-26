import pandas as pd

subs = pd.read_csv('subs.csv')
deployment = pd.read_csv('deployment.csv')

# new_file = pd.DataFrame()

# for row in deployment['Close job - SN']:
    
#     if len(str(row).split(","))!=1: new_file[]


test_df = pd.DataFrame({
    "Name":['John', 'Mary'],
    "Age":[25,19]
})

print(test_df)