using UnityEngine;
using System.Collections.Generic;

[System.Serializable]
public class MaterialTarget
{
    public SkinnedMeshRenderer renderer;
    public int materialIndex;
}

public class AttendeeMaterials : MonoBehaviour
{
    // list of materials; seperated for performance
    public List<MaterialTarget> skin;
    public List<MaterialTarget> hair;
    public List<MaterialTarget> shirt;


    // sets a list of materials to the desired material
    public void SetMaterial(List<MaterialTarget> targets, Material newMaterial)
    {
        foreach (var target in targets)
        {
            if (target.renderer != null && target.materialIndex < target.renderer.materials.Length)
            {
                var materials = target.renderer.materials;
                materials[target.materialIndex] = newMaterial;
                target.renderer.materials = materials;
            }
            else
            {
                Debug.LogWarning($"Invalid renderer or material index for {target.renderer.name}");
            }
        }
    }
}