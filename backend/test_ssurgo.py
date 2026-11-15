import requests

URL = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest"
LAT, LON = 31.5, -97.1

query = f"""
SELECT TOP 5 mu.mukey, mu.muname, mu.farmlndcl,
       co.compname, co.comppct_r, co.drainagecl, co.slope_r, co.hydgrp
FROM mapunit mu
INNER JOIN component co ON co.mukey = mu.mukey
WHERE mu.mukey IN (
    SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point({LON} {LAT})')
)
ORDER BY co.comppct_r DESC
"""

r = requests.post(URL, json={"format": "JSON+COLUMNNAME", "query": query}, timeout=60)
print(r.status_code)
print(r.text[:1500])