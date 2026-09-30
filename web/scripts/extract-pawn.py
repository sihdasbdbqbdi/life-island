"""Extract Photoshop vector masks; preserve source contours and centered strokes."""
import json,sys
from pathlib import Path
from psd_tools import PSDImage
source=Path(sys.argv[1]);psd=PSDImage.open(source)
scale=40/322

def point(p):
 y,x=p
 return ((x*psd.width-88)*scale,(y*psd.height-29)*scale)
def pair(p):return ' '.join(f'{v:.4f}' for v in point(p))
paths={}
for layer in psd.descendants():
 if not layer.has_vector_mask():continue
 parts=[]
 for subpath in layer.vector_mask.paths:
  knots=list(subpath)
  if not knots:continue
  parts.append('M'+pair(knots[0].anchor))
  for i,k in enumerate(knots):
   following=knots[(i+1)%len(knots)]
   parts.append('C'+pair(k.leaving)+' '+pair(following.preceding)+' '+pair(following.anchor))
  parts.append('Z')
 paths[layer.name]=' '.join(parts)
result={'body':paths['身体_主体'],'leftArm':paths['左手_主体'],'rightArm':paths['右手_主体'],'leftButton':paths['身体_装饰_左'],'rightButton':paths['身体_装饰_右'],'head':paths['头'],'stroke':35*scale,'headStroke':36*scale,'legSplitY':(391-29)*scale,'legSplitX':(250-88)*scale}
Path('web/src/pawn-art.js').write_text('// Extracted from 素材/小人.psd. Regenerate with web/scripts/extract-pawn.py.\nexport default '+json.dumps(result,ensure_ascii=False,indent=2)+';\n')
