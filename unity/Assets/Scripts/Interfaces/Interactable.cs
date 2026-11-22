using UnityEngine;

/*
    Interface for all interactable objects (can click)
*/
public abstract class Interactable : MonoBehaviour
{
    public void OnHoverStart()
    {
    }
    public void OnHoverEnd()
    {
    }
    public void EnableInteract()
    {
        gameObject.layer = LayerMask.NameToLayer("Interactable");
    }
    public void DisableInteract()
    {
        gameObject.layer = LayerMask.NameToLayer("Default");
    }
    
    public abstract void OnInteract();
}
