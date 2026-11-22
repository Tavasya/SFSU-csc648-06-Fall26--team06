using System;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;


public class DetectCrosshair : MonoBehaviour
{
    public Material OutlineMaterial;
    public float detectionRange = 5f;
    public LayerMask interactableLayer;
    private Sprite defaultCrosshairSprite;
    public Sprite crosshairSprite;
    public Sprite detectedCrosshairSprite;
    public InputActionReference clickAction;

    Interactable currentTarget;

    // Crosshair Variables
    [SerializeField] UIDocument uiDocument;
    private Image crosshairElement;

    void Start()
    {

        if (clickAction == null)
            Debug.LogError("Click Action not assigned in inspector.");


        // find crosshair in UI doc
        var uiRoot = uiDocument.rootVisualElement;
        var panel = uiRoot.Q<VisualElement>("Panel");
        var crosshair = panel.Q<Image>("Crosshair");
        if (crosshair == null)
        {
            Debug.LogError("Crosshair Image not found in UI Document.");
            return;
        }
        crosshairElement = crosshair;

        // update default crosshair sprite if new one assigned in inspector
        if (crosshairSprite != null)
        {
            crosshairElement.sprite = crosshairSprite;
            defaultCrosshairSprite = crosshairSprite;
        } else
        {
            defaultCrosshairSprite = crosshairElement.sprite;
        }
        if (crosshairElement.sprite == null)
        {
            Debug.LogError("Crosshair sprite is not assigned in the UI Document or inspector.");
        }

        // // disable cursor and lock it to center of screen
        if (UnityEngine.Cursor.visible)
        {
            UnityEngine.Cursor.visible = false;
            UnityEngine.Cursor.lockState = CursorLockMode.Locked;
        }
    }

    void OnEnable() => clickAction.action.Enable();
    void OnDisable() => clickAction.action.Disable();

    void Update()
    {

        // Ray from center of screen (crosshair)
        Ray ray = Camera.main.ScreenPointToRay(
            new Vector2(Screen.width / 2f, Screen.height / 2f)
        );
        // draw ray
        Debug.DrawRay(ray.origin, ray.direction * detectionRange, Color.red);

        if (Physics.Raycast(ray, out RaycastHit hit, detectionRange, interactableLayer))
        {
            Interactable interactable = hit.collider.GetComponent<Interactable>();
            if (interactable == null)
                return;

            // updates crosshair and current targer
            if (currentTarget != interactable)
            {
                currentTarget?.OnHoverEnd();
                RemoveOutline();
                currentTarget = interactable;
                currentTarget.OnHoverStart();
                AddOutline();

                
                crosshairElement.sprite = detectedCrosshairSprite;
            }

            if (clickAction.action.WasPerformedThisFrame())
                currentTarget.OnInteract();
            

            return;
            
        }

        // No interactable hit
        if (currentTarget != null)
        {
            currentTarget.OnHoverEnd();
            RemoveOutline();
        }
        currentTarget = null;
        crosshairElement.sprite = defaultCrosshairSprite;

    }

    private void AddOutline()
    {
        if (currentTarget == null) return;
        if (OutlineMaterial == null)
        {
            Debug.LogError("Outline Material is not assigned in the inspector.");
            return;
        }

        if (currentTarget.TryGetComponent<MeshRenderer>(out MeshRenderer mr))
        {
            var mats = mr.materials;
            Array.Resize(ref mats, mats.Length + 1);
            mats[mats.Length - 1] = OutlineMaterial;
            mr.materials = mats;
        }
    }

    private void RemoveOutline()
    {
        if (currentTarget == null) return;

        if (currentTarget.TryGetComponent<MeshRenderer>(out MeshRenderer mr))
        {
            var mats = mr.materials;
            Array.Resize(ref mats, mats.Length - 1);
            mr.materials = mats;
        }
    }
}
